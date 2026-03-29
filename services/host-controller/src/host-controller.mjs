import { access, constants, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import net from "node:net";

import { loadProxyShareLinks, writeSingBoxConfig } from "./proxy-links.mjs";

const POWERSHELL_EXE = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function normalizeRuntimeMode(value, fallback = "alternate_desktop") {
  return value === "visible_auth" || value === "hidden_runtime" || value === "alternate_desktop"
    ? value
    : fallback;
}

function normalizeProfileStrategy(value, fallback = "durable") {
  return value === "diagnostic_fresh" || value === "durable"
    ? value
    : fallback;
}

function toPowerShellRuntimeMode(runtimeMode) {
  if (runtimeMode === "visible_auth") {
    return "VisibleAuth";
  }

  if (runtimeMode === "alternate_desktop") {
    return "AlternateDesktop";
  }

  return "HiddenRuntime";
}

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

function parseJsonOutput(stdout) {
  const trimmed = stdout.trim();

  if (trimmed.length === 0) {
    throw new Error("validation_output_missing");
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Keep scanning backwards for the last JSON line.
    }
  }

  throw new Error("validation_output_unparseable");
}

function isWorkerReachable(workerStatus) {
  return Boolean(workerStatus.agentListening) && Boolean(workerStatus.browserListening);
}

function hasWorkerHealth(workerStatus) {
  return Boolean(workerStatus.agentListening) && workerStatus.runtimeStatus !== null;
}

function withStartupFields(
  workerStatus,
  startupStatus,
  fallbackRuntimeMode = null
) {
  return {
    ...workerStatus,
    status: startupStatus,
    startupStatus,
    runtimeMode: workerStatus.runtimeMode ?? fallbackRuntimeMode
  };
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
      this.config.workers.map((worker) => this.getWorkerStatus(worker))
    );
  }

  async getWorkerStatus(worker, runtimeModeFallback = null) {
    const agentListening = await testLocalPort(worker.agentPort);
    const health =
      agentListening
        ? await this.fetchWorkerHealth(worker.agentPort)
        : null;

    return {
      workerId: worker.workerId,
      displayName: worker.displayName,
      agentPort: worker.agentPort,
      cdpPort: worker.cdpPort,
      proxyServer: this.config.proxyServerUrl,
      agentListening,
      browserListening: health
        ? Boolean(health.browserContextReady)
        : await testLocalPort(worker.cdpPort),
      runtimeMode: health?.runtimeMode ?? runtimeModeFallback,
      runtimeClass: health?.runtimeClass ?? null,
      runtimeDesktopName: health?.runtimeDesktopName ?? null,
      headless: health?.headless ?? null,
      cdpAttached: health?.cdpAttached ?? null,
      proxyServerConfigured: health?.proxyServerConfigured ?? null,
      runtimeStatus: health?.runtimeStatus ?? null
    };
  }

  async fetchWorkerHealth(agentPort) {
    try {
      const response = await fetch(`http://127.0.0.1:${agentPort}/health`, {
        signal: AbortSignal.timeout(1_500)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  async getProxyRuntimeStatus() {
    const listening = await testLocalPort(
      this.config.proxyMixedPort,
      this.config.proxyListenHost
    );

    return {
      listenHost: this.config.proxyListenHost,
      listenPort: this.config.proxyMixedPort,
      proxyServerUrl: this.config.proxyServerUrl,
      listening
    };
  }

  getObservedPoolStatus(proxyListening, workers) {
    if (!proxyListening && workers.every((worker) => !isWorkerReachable(worker))) {
      return "idle";
    }

    if (proxyListening && workers.length > 0 && workers.every(isWorkerReachable)) {
      return "ready";
    }

    return "degraded";
  }

  async getHealthSnapshot() {
    const [proxy, workers] = await Promise.all([
      this.getProxyRuntimeStatus(),
      this.getWorkerStatuses()
    ]);

    return {
      proxyListening: proxy.listening,
      proxyServerUrl: proxy.proxyServerUrl,
      poolStatus: this.getObservedPoolStatus(proxy.listening, workers),
      workers
    };
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

  async resolveWorkerProfilePath(worker, profileStrategy, runtimeMode) {
    const resolvedProfileStrategy = normalizeProfileStrategy(profileStrategy, "durable");

    if (resolvedProfileStrategy !== "diagnostic_fresh") {
      return worker.profilePath;
    }

    const diagnosticProfilePath = join(
      this.config.repoRoot,
      "infra",
      "data",
      "host-profile-diagnostics",
      worker.workerId
    );

    if (runtimeMode === "visible_auth") {
      await rm(diagnosticProfilePath, {
        force: true,
        recursive: true
      });
    }

    await mkdir(diagnosticProfilePath, {
      recursive: true
    });

    return diagnosticProfilePath;
  }

  async startWorker(
    workerId,
    runtimeMode = this.config.defaultWorkerRuntimeMode,
    profileStrategy = "durable"
  ) {
    const worker = this.requireWorker(workerId);
    const proxyRuntime = await this.ensureProxyReady();
    const resolvedRuntimeMode = normalizeRuntimeMode(
      runtimeMode,
      this.config.defaultWorkerRuntimeMode ?? "alternate_desktop"
    );
    const resolvedProfileStrategy = normalizeProfileStrategy(
      profileStrategy,
      "durable"
    );
    const resolvedProfilePath = await this.resolveWorkerProfilePath(
      worker,
      resolvedProfileStrategy,
      resolvedRuntimeMode
    );

    const existingStatus = await this.getWorkerStatus(
      worker,
      resolvedRuntimeMode
    );

    if (hasWorkerHealth(existingStatus)) {
      return {
        ...withStartupFields(
          existingStatus,
          "already_running",
          resolvedRuntimeMode
        ),
        workerId,
        proxyServerUrl: proxyRuntime.proxyServerUrl,
        profileStrategy: resolvedProfileStrategy,
        profilePath: resolvedProfilePath
      };
    }

    await this.requestWorkerStart(
      worker,
      resolvedRuntimeMode,
      proxyRuntime.proxyServerUrl,
      {
        profilePath: resolvedProfilePath,
        profileStrategy: resolvedProfileStrategy
      }
    );

    const startedStatus = await this.observeWorkerStartup(
      worker,
      resolvedRuntimeMode
    );

    return {
      ...startedStatus,
      workerId,
      proxyServerUrl: proxyRuntime.proxyServerUrl,
      runtimeMode: startedStatus.runtimeMode ?? resolvedRuntimeMode,
      profileStrategy: resolvedProfileStrategy,
      profilePath: resolvedProfilePath
    };
  }

  async stopWorker(workerId) {
    const worker = this.requireWorker(workerId);
    await this.requestWorkerStop(worker);

    return {
      workerId,
      status: "stop_requested"
    };
  }

  async validateAlternateDesktop(workerId) {
    const worker = this.requireWorker(workerId);

    return this.runAlternateDesktopValidation(worker);
  }

  async startPool(runtimeMode = this.config.defaultWorkerRuntimeMode) {
    const results = [];
    const resolvedRuntimeMode = normalizeRuntimeMode(
      runtimeMode,
      this.config.defaultWorkerRuntimeMode ?? "alternate_desktop"
    );

    for (const worker of this.config.workers) {
      results.push(await this.startWorker(worker.workerId, resolvedRuntimeMode));
      await sleep(500);
    }

    const health = await this.getHealthSnapshot();

    return {
      action: "pool_start_requested",
      runtimeMode: resolvedRuntimeMode,
      proxyListening: health.proxyListening,
      proxyServerUrl: health.proxyServerUrl,
      poolStatus: health.poolStatus,
      workers: results
    };
  }

  async observeWorkerStartup(
    worker,
    runtimeMode,
    timeoutMs = 20_000,
    pollIntervalMs = 1_000
  ) {
    const deadline = Date.now() + timeoutMs;
    let latestStatus = await this.getWorkerStatus(worker, runtimeMode);

    while (Date.now() < deadline) {
      if (hasWorkerHealth(latestStatus)) {
        return withStartupFields(latestStatus, "started", runtimeMode);
      }

      await sleep(pollIntervalMs);
      latestStatus = await this.getWorkerStatus(worker, runtimeMode);
    }

    return withStartupFields(latestStatus, "startup_timeout", runtimeMode);
  }

  async stopProxyRuntime() {
    const proxyRuntime = await this.getProxyRuntimeStatus();

    if (!proxyRuntime.listening) {
      return {
        status: "already_stopped",
        listenPort: this.config.proxyMixedPort
      };
    }

    const child = spawn(
      POWERSHELL_EXE,
      [
        "-NoProfile",
        "-Command",
        [
          `$connections = Get-NetTCPConnection -LocalPort ${this.config.proxyMixedPort} -ErrorAction SilentlyContinue;`,
          "if ($connections) {",
          "  $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {",
          "    if ($_ -gt 0 -and (Get-Process -Id $_ -ErrorAction SilentlyContinue)) {",
          "      Stop-Process -Id $_ -Force",
          "    }",
          "  }",
          "}"
        ].join(" ")
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

        reject(new Error(`stop_proxy_failed:${code}`));
      });
      child.once("error", reject);
    });

    return {
      status: "stop_requested",
      listenPort: this.config.proxyMixedPort
    };
  }

  async stopPool() {
    const results = [];

    for (const worker of this.config.workers) {
      results.push(await this.stopWorker(worker.workerId));
      await sleep(500);
    }

    const proxy = await this.stopProxyRuntime();
    const health = await this.getHealthSnapshot();

    return {
      action: "pool_stop_requested",
      proxyAction: proxy.status,
      proxyListening: health.proxyListening,
      proxyServerUrl: health.proxyServerUrl,
      poolStatus: health.poolStatus,
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

  async requestWorkerStart(
    worker,
    runtimeMode,
    proxyServerUrl,
    startOptions = {}
  ) {
    const profilePath = startOptions.profilePath ?? worker.profilePath;
    const profileStrategy = normalizeProfileStrategy(
      startOptions.profileStrategy,
      "durable"
    );
    const escapedArguments = [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      worker.startScriptPath,
      "-SkipInstall",
      "-DetachAgent",
      "-ProxyServer",
      proxyServerUrl,
      "-RuntimeMode",
      toPowerShellRuntimeMode(runtimeMode),
      "-ProfileStrategy",
      profileStrategy === "diagnostic_fresh" ? "DiagnosticFresh" : "Durable",
      "-ProfilePath",
      profilePath,
      "-BrowserWindowMode",
      this.config.browserWindowMode
    ].map((value) => `'${String(value).replaceAll("'", "''")}'`);
    const command = `$argList = @(${escapedArguments.join(", ")}); Start-Process -FilePath '${POWERSHELL_EXE}' -ArgumentList $argList -WindowStyle Hidden`;
    const child = spawn(
      POWERSHELL_EXE,
      [
        "-ExecutionPolicy",
        "Bypass",
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
  }

  async requestWorkerStop(worker) {
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
  }

  async runAlternateDesktopValidation(worker) {
    const child = spawn(
      POWERSHELL_EXE,
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        this.config.alternateDesktopValidationScriptPath,
        "-WorkerId",
        worker.workerId,
        "-PublicBaseUrl",
        this.config.publicBaseUrl,
        "-InternalBaseUrl",
        this.config.internalBaseUrl,
        "-InternalAdminToken",
        this.config.internalAdminToken,
        "-HostControllerBaseUrl",
        this.config.selfBaseUrl,
        "-HostControllerToken",
        this.config.authToken,
        "-ReturnJsonLine"
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    await new Promise((resolve, reject) => {
      child.once("exit", (code) => {
        if (code === 0 || code === null) {
          resolve();
          return;
        }

        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        reject(
          new Error(
            stderr.length > 0
              ? `alternate_desktop_validation_failed:${worker.workerId}:${stderr}`
              : `alternate_desktop_validation_failed:${worker.workerId}:${code}`
          )
        );
      });
      child.once("error", reject);
    });

    return parseJsonOutput(Buffer.concat(stdoutChunks).toString("utf8"));
  }
}
