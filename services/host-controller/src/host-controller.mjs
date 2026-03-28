import { access, constants, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import net from "node:net";

import { loadProxyShareLinks, writeSingBoxConfig } from "./proxy-links.mjs";

const POWERSHELL_EXE = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function testLocalPort(port, host = "127.0.0.1", timeoutMs = 1_000) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const finalize = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finalize(true));
    socket.once("timeout", () => finalize(false));
    socket.once("error", () => finalize(false));
  });
}

function spawnDetached(command, args, options = {}) {
  const child = spawn(command, args, {
    detached: true,
    windowsHide: true,
    stdio: options.stdio ?? "ignore",
    cwd: options.cwd,
    env: options.env
  });

  child.unref();
  return child;
}

export class HostController {
  constructor(config) {
    this.config = config;
  }

  requireWorker(workerId) {
    const worker = this.config.workers.find((entry) => entry.workerId === workerId);

    if (!worker) {
      throw new Error(`worker_not_found:${workerId}`);
    }

    return worker;
  }

  async getWorkerStatuses() {
    return Promise.all(
      this.config.workers.map(async (worker) => ({
        workerId: worker.workerId,
        displayName: worker.displayName,
        agentPort: worker.agentPort,
        cdpPort: worker.cdpPort,
        proxyServer: this.config.proxyServerUrl,
        agentListening: await testLocalPort(worker.agentPort),
        browserListening: await testLocalPort(worker.cdpPort)
      }))
    );
  }

  async ensureProxyReady() {
    const proxyLinks = await loadProxyShareLinks(this.config.proxyShareLinksPath);
    await writeSingBoxConfig(this.config.proxyConfigPath, proxyLinks);

    if (await testLocalPort(proxyLinks.listenPort, proxyLinks.listenHost)) {
      return {
        listenHost: proxyLinks.listenHost,
        listenPort: proxyLinks.listenPort,
        proxyServerUrl: `http://${proxyLinks.listenHost}:${proxyLinks.listenPort}`
      };
    }

    await this.ensureSingBoxInstalled();
    await this.startSingBox();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (await testLocalPort(proxyLinks.listenPort, proxyLinks.listenHost)) {
        return {
          listenHost: proxyLinks.listenHost,
          listenPort: proxyLinks.listenPort,
          proxyServerUrl: `http://${proxyLinks.listenHost}:${proxyLinks.listenPort}`
        };
      }

      await sleep(500);
    }

    throw new Error("proxy_runtime_failed_to_start");
  }

  async startWorker(workerId) {
    const worker = this.requireWorker(workerId);
    const proxyRuntime = await this.ensureProxyReady();

    if (await testLocalPort(worker.agentPort)) {
      return {
        workerId,
        status: "already_running",
        proxyServerUrl: proxyRuntime.proxyServerUrl
      };
    }

    const escapedArguments = [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      worker.startScriptPath,
      "-SkipInstall",
      "-DetachAgent",
      "-ProxyServer",
      proxyRuntime.proxyServerUrl,
      "-BrowserWindowMode",
      this.config.browserWindowMode
    ].map((value) => `'${String(value).replaceAll("'", "''")}'`);
    const command = `$argList = @(${escapedArguments.join(", ")}); Start-Process -FilePath '${POWERSHELL_EXE}' -ArgumentList $argList -WindowStyle Hidden`;
    const child = spawn(
      POWERSHELL_EXE,
      [
        "-NoProfile",
        "-Command",
        command
      ],
      {
        windowsHide: true,
        stdio: "ignore"
      }
    );

    await new Promise((resolve, reject) => {
      child.once("exit", (code) => {
        if (code === 0 || code === null) {
          resolve();
          return;
        }

        reject(new Error(`start_worker_failed:${worker.workerId}:${code}`));
      });
      child.once("error", reject);
    });

    return {
      workerId,
      status: "start_requested",
      proxyServerUrl: proxyRuntime.proxyServerUrl
    };
  }

  async stopWorker(workerId) {
    const worker = this.requireWorker(workerId);

    const child = spawn(
      POWERSHELL_EXE,
      [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        this.config.stopWorkerScriptPath,
        "-WorkerId",
        worker.workerId,
        "-AgentPort",
        String(worker.agentPort),
        "-CdpPort",
        String(worker.cdpPort),
        "-ProfilePath",
        worker.profilePath
      ],
      {
        windowsHide: true,
        stdio: "ignore"
      }
    );

    await new Promise((resolve, reject) => {
      child.once("exit", (code) => {
        if (code === 0 || code === null) {
          resolve();
          return;
        }

        reject(new Error(`stop_worker_failed:${worker.workerId}:${code}`));
      });
      child.once("error", reject);
    });

    return {
      workerId,
      status: "stop_requested"
    };
  }

  async startPool() {
    const results = [];

    for (const worker of this.config.workers) {
      results.push(await this.startWorker(worker.workerId));
      await sleep(500);
    }

    return {
      action: "pool_start_requested",
      workers: results
    };
  }

  async ensureSingBoxInstalled() {
    try {
      await access(this.config.singBoxBinaryPath, constants.X_OK);
      return;
    } catch {
      const child = spawn(
        POWERSHELL_EXE,
        [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          this.config.installSingBoxScriptPath,
          "-RepoRoot",
          this.config.repoRoot
        ],
        {
          windowsHide: true,
          stdio: "ignore"
        }
      );

      await new Promise((resolve, reject) => {
        child.once("exit", (code) => {
          if (code === 0 || code === null) {
            resolve();
            return;
          }

          reject(new Error(`install_sing_box_failed:${code}`));
        });
        child.once("error", reject);
      });

      await access(this.config.singBoxBinaryPath, constants.X_OK);
    }
  }

  async startSingBox() {
    await mkdir(join(this.config.repoRoot, "infra", "data", "proxy", "logs"), {
      recursive: true
    });

    spawnDetached(
      this.config.singBoxBinaryPath,
      [
        "run",
        "-c",
        this.config.proxyConfigPath
      ]
    );
  }
}
