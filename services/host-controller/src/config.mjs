import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

const DEFAULT_WORKERS = [
  {
    workerId: "dad",
    displayName: "Dad",
    agentPort: 4021,
    cdpPort: 9222,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "dad"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-dad-host-worker.ps1")
  },
  {
    workerId: "wife",
    displayName: "Wife",
    agentPort: 4022,
    cdpPort: 9223,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "wife"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-wife-host-worker.ps1")
  },
  {
    workerId: "shared-1",
    displayName: "Shared 1",
    agentPort: 4023,
    cdpPort: 9224,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-1"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-1-host-worker.ps1")
  }
];

function parseInteger(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadHostControllerConfig(env = process.env) {
  return {
    repoRoot: env.HOST_CONTROLLER_REPO_ROOT ?? REPO_ROOT,
    host: env.HOST_CONTROLLER_HOST ?? "0.0.0.0",
    port: parseInteger(env.HOST_CONTROLLER_PORT, 4040),
    authToken: env.HOST_CONTROLLER_TOKEN ?? "local-host-controller-token",
    proxyShareLinksPath:
      env.HOST_PROXY_SHARE_LINKS_PATH ??
      resolve(REPO_ROOT, "infra", "data", "proxy", "share-links.local.json"),
    proxyConfigPath:
      env.HOST_PROXY_CONFIG_PATH ??
      resolve(REPO_ROOT, "infra", "data", "proxy", "sing-box", "config.json"),
    proxyListenHost: env.HOST_PROXY_LISTEN_HOST ?? "127.0.0.1",
    proxyMixedPort: parseInteger(env.HOST_PROXY_MIXED_PORT, 7897),
    proxyHealthUrl:
      env.HOST_PROXY_HEALTH_URL ?? "https://www.gstatic.com/generate_204",
    singBoxBinaryPath:
      env.SING_BOX_BINARY_PATH ??
      resolve(REPO_ROOT, "infra", "tools", "sing-box", "current", "sing-box.exe"),
    installSingBoxScriptPath:
      env.SING_BOX_INSTALL_SCRIPT_PATH ??
      resolve(REPO_ROOT, "infra", "proxy", "install-sing-box.ps1"),
    stopWorkerScriptPath:
      env.HOST_WORKER_STOP_SCRIPT_PATH ??
      resolve(REPO_ROOT, "infra", "host-worker", "stop-host-native-worker.ps1"),
    browserWindowMode: env.HOST_BROWSER_WINDOW_MODE ?? "Minimized",
    proxyServerUrl:
      env.HOST_PROXY_SERVER_URL ??
      `http://${env.HOST_PROXY_LISTEN_HOST ?? "127.0.0.1"}:${parseInteger(env.HOST_PROXY_MIXED_PORT, 7897)}`,
    workers: DEFAULT_WORKERS
  };
}
