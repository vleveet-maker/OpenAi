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
  },
  {
    workerId: "shared-2",
    displayName: "Shared 2",
    agentPort: 4024,
    cdpPort: 9225,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-2"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-2-host-worker.ps1")
  },
  {
    workerId: "shared-3",
    displayName: "Shared 3",
    agentPort: 4025,
    cdpPort: 9226,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-3"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-3-host-worker.ps1")
  },
  {
    workerId: "shared-4",
    displayName: "Shared 4",
    agentPort: 4026,
    cdpPort: 9227,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-4"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-4-host-worker.ps1")
  },
  {
    workerId: "shared-5",
    displayName: "Shared 5",
    agentPort: 4027,
    cdpPort: 9228,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-5"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-5-host-worker.ps1")
  },
  {
    workerId: "shared-6",
    displayName: "Shared 6",
    agentPort: 4028,
    cdpPort: 9229,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-6"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-6-host-worker.ps1")
  },
  {
    workerId: "shared-7",
    displayName: "Shared 7",
    agentPort: 4029,
    cdpPort: 9230,
    profilePath: resolve(REPO_ROOT, "infra", "data", "host-profiles", "shared-7"),
    startScriptPath: resolve(REPO_ROOT, "infra", "host-worker", "start-shared-7-host-worker.ps1")
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
    alternateDesktopValidationScriptPath:
      env.HOST_ALTERNATE_DESKTOP_VALIDATION_SCRIPT_PATH ??
      resolve(REPO_ROOT, "infra", "host-worker", "test-alternate-desktop-runtime.ps1"),
    defaultWorkerRuntimeMode: env.HOST_WORKER_RUNTIME_MODE ?? "visible_auth",
    browserWindowMode: env.HOST_BROWSER_WINDOW_MODE ?? "CompactCorner",
    publicBaseUrl: env.HOST_PUBLIC_BASE_URL ?? "http://127.0.0.1:8080",
    internalBaseUrl: env.HOST_INTERNAL_BASE_URL ?? "http://127.0.0.1:8081",
    internalAdminToken:
      env.HOST_INTERNAL_ADMIN_TOKEN ?? "local-internal-admin-token",
    selfBaseUrl:
      env.HOST_CONTROLLER_SELF_BASE_URL ??
      `http://127.0.0.1:${parseInteger(env.HOST_CONTROLLER_PORT, 4040)}`,
    proxyServerUrl:
      env.HOST_PROXY_SERVER_URL ??
      `http://${env.HOST_PROXY_LISTEN_HOST ?? "127.0.0.1"}:${parseInteger(env.HOST_PROXY_MIXED_PORT, 7897)}`,
    workers: DEFAULT_WORKERS
  };
}
