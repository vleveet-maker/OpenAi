import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeWorkerStatus,
  type WorkerStatus
} from "./workers/worker-status.js";

export type WorkerRuntimeType = "docker" | "host";
export type ControlApiMode = "full_app" | "remote_relay";

export interface WorkerDefinition {
  workerId: string;
  displayName: string;
  containerName: string;
  profilePath: string;
  agentBaseUrl: string;
  runtimeType?: WorkerRuntimeType;
  defaultStatus: WorkerStatus;
}

export interface ControlApiConfig {
  serviceName: string;
  mode?: ControlApiMode;
  host: string;
  port: number;
  rolloutSmokeStatePath?: string;
  readinessRecoveryStatePath?: string;
  postRecoveryRegressionStatePath?: string;
  zeroReadyRootCauseStatePath?: string;
  disconnectedBaselineRemediationStatePath?: string;
  disconnectedRuntimeRemediationStatePath?: string;
  persistentDisconnectedRuntimeFollowupStatePath?: string;
  runtimeParityBackportRemediationStatePath?: string;
  postParityDisconnectedRuntimeRemediationStatePath?: string;
  postPhase21DisconnectedRuntimeFollowupStatePath?: string;
  postPhase22SmokeWrapperParityRemediationStatePath?: string;
  postPhase23ExactSmokeWrapperCompatRemediationStatePath?: string;
  postPhase24ExternalApiReadinessStatePath?: string;
  postPhase25ExternalRestorationStatePath?: string;
  postPhase26UbuntuSshRecoveryStatePath?: string;
  postPhase27LocalProxyBootstrapStatePath?: string;
  postPhase28LocalProxyTransportStatePath?: string;
  postPhase29Shared2Chat409StatePath?: string;
  postPhase30Shared2BootstrapRecoveryStatePath?: string;
  postPhase31AccountSurfaceInventoryStatePath?: string;
  postPhase31SelectedCanaryChatRecoveryStatePath?: string;
  postPhase32RotatingReadyAccountChatProofStatePath?: string;
  postPhase33AccountBrowserIsolationStatePath?: string;
  postPhase33IsolatedExternalChatProofStatePath?: string;
  postPhase34ServerIsolatedChatTransferStatePath?: string;
  postPhase35ServerTokenSshListenerRecoveryStatePath?: string;
  postPhase36ReverseTunnelChatSmokeStatePath?: string;
  postRemediationDegradedSmokeStatePath?: string;
  postStabilizationRuntimeInvestigationStatePath?: string;
  remoteRelayDefaultWorkerId?: string;
  internalAdminToken?: string;
  remoteRelayApiToken?: string;
  remoteRelayRequestTimeoutMs?: number;
  remoteRelayTopologyHint?: string;
  hostControllerBaseUrl?: string;
  hostControllerToken?: string;
  autoStartHostWorkers: boolean;
  sessionDatabasePath: string;
  sessionDurationMinutes: number;
  sessionSweepIntervalMs: number;
  sessionClientDistPath: string;
  dockerSocketPath: string;
  workerHealthPollIntervalMs: number;
  workerHealthTimeoutMs: number;
  workerDefinitions: WorkerDefinition[];
}

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_SESSION_DATABASE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "control-api",
  "session-routing.sqlite"
);
const DEFAULT_SESSION_CLIENT_DIST_PATH = resolve(
  REPO_ROOT,
  "apps",
  "session-client",
  "dist"
);
const DEFAULT_ROLLOUT_SMOKE_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "rollout-smoke",
  "latest.json"
);
const DEFAULT_READINESS_RECOVERY_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "readiness-recovery",
  "latest.json"
);
const DEFAULT_POST_RECOVERY_REGRESSION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-recovery-regression",
  "latest.json"
);
const DEFAULT_ZERO_READY_ROOT_CAUSE_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "zero-ready-root-cause",
  "latest.json"
);
const DEFAULT_DISCONNECTED_BASELINE_REMEDIATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "disconnected-baseline-remediation",
  "latest.json"
);
const DEFAULT_DISCONNECTED_RUNTIME_REMEDIATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "disconnected-runtime-remediation",
  "latest.json"
);
const DEFAULT_PERSISTENT_DISCONNECTED_RUNTIME_FOLLOWUP_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "persistent-disconnected-runtime-followup",
  "latest.json"
);
const DEFAULT_RUNTIME_PARITY_BACKPORT_REMEDIATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "runtime-parity-backport-remediation",
  "latest.json"
);
const DEFAULT_POST_PARITY_DISCONNECTED_RUNTIME_REMEDIATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-parity-disconnected-runtime-remediation",
  "latest.json"
);
const DEFAULT_POST_PHASE21_DISCONNECTED_RUNTIME_FOLLOWUP_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase21-disconnected-runtime-followup",
  "latest.json"
);
const DEFAULT_POST_PHASE22_SMOKE_WRAPPER_PARITY_REMEDIATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase22-smoke-wrapper-parity-remediation",
  "latest.json"
);
const DEFAULT_POST_PHASE23_EXACT_SMOKE_WRAPPER_COMPAT_REMEDIATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase23-exact-smoke-wrapper-compat-remediation",
  "latest.json"
);
const DEFAULT_POST_PHASE24_EXTERNAL_API_READINESS_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase24-external-api-readiness",
  "latest.json"
);
const DEFAULT_POST_PHASE25_EXTERNAL_RESTORATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase25-external-restoration",
  "latest.json"
);
const DEFAULT_POST_PHASE26_UBUNTU_SSH_RECOVERY_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase26-ubuntu-ssh-recovery",
  "latest.json"
);
const DEFAULT_POST_PHASE27_LOCAL_PROXY_BOOTSTRAP_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase27-local-proxy-bootstrap",
  "latest.json"
);
const DEFAULT_POST_PHASE28_LOCAL_PROXY_TRANSPORT_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase28-local-proxy-transport",
  "latest.json"
);
const DEFAULT_POST_PHASE29_SHARED2_CHAT_409_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase29-shared-2-chat-409",
  "latest.json"
);
const DEFAULT_POST_PHASE30_SHARED2_BOOTSTRAP_RECOVERY_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase30-shared-2-bootstrap-recovery",
  "latest.json"
);
const DEFAULT_POST_PHASE31_ACCOUNT_SURFACE_INVENTORY_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase31-account-surface-inventory",
  "latest.json"
);
const DEFAULT_POST_PHASE31_SELECTED_CANARY_CHAT_RECOVERY_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase31-selected-canary-chat-recovery",
  "latest.json"
);
const DEFAULT_POST_PHASE32_ROTATING_READY_ACCOUNT_CHAT_PROOF_STATE_PATH =
  resolve(
    REPO_ROOT,
    "infra",
    "data",
    "post-phase32-rotating-ready-account-chat-proof",
    "latest.json"
  );
const DEFAULT_POST_PHASE33_ACCOUNT_BROWSER_ISOLATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase33-account-browser-isolation",
  "latest.json"
);
const DEFAULT_POST_PHASE33_ISOLATED_EXTERNAL_CHAT_PROOF_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase33-isolated-external-chat-proof",
  "latest.json"
);
const DEFAULT_POST_PHASE34_SERVER_ISOLATED_CHAT_TRANSFER_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase34-server-isolated-chat-transfer",
  "latest.json"
);
const DEFAULT_POST_PHASE35_SERVER_TOKEN_SSH_LISTENER_RECOVERY_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase35-server-token-ssh-listener-recovery",
  "latest.json"
);
const DEFAULT_POST_PHASE36_REVERSE_TUNNEL_CHAT_SMOKE_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-phase36-reverse-tunnel-chat-smoke",
  "latest.json"
);
const DEFAULT_POST_REMEDIATION_DEGRADED_SMOKE_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-remediation-degraded-smoke",
  "latest.json"
);
const DEFAULT_POST_STABILIZATION_RUNTIME_INVESTIGATION_STATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "data",
  "post-stabilization-runtime-investigation",
  "latest.json"
);
const DEFAULT_DOCKER_SOCKET_PATH = "/var/run/docker.sock";

const DEFAULT_WORKERS: WorkerDefinition[] = [
  {
    workerId: "dad",
    displayName: "Dad",
    containerName: "worker-dad",
    profilePath: "/srv/chatgpt-workers/profiles/dad",
    agentBaseUrl: "http://worker-dad:4020",
    runtimeType: "docker",
    defaultStatus: "starting"
  },
  {
    workerId: "wife",
    displayName: "Wife",
    containerName: "worker-wife",
    profilePath: "/srv/chatgpt-workers/profiles/wife",
    agentBaseUrl: "http://worker-wife:4020",
    runtimeType: "docker",
    defaultStatus: "starting"
  },
  {
    workerId: "shared-1",
    displayName: "Shared 1",
    containerName: "worker-shared-1",
    profilePath: "/srv/chatgpt-workers/profiles/shared-1",
    agentBaseUrl: "http://worker-shared-1:4020",
    runtimeType: "docker",
    defaultStatus: "starting"
  }
];

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseWorkerDefinitions(raw: string | undefined): WorkerDefinition[] | null {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as Array<Record<string, string>>;

  return parsed.map((entry, index) => {
    const workerId = entry.workerId?.trim();

    if (!workerId) {
      throw new Error(`WORKER_DEFINITIONS entry ${index} is missing workerId`);
    }

    return {
      workerId,
      displayName: entry.displayName?.trim() || workerId,
      containerName: entry.containerName ?? `worker-${workerId}`,
      profilePath:
        entry.profilePath ??
        `/srv/chatgpt-workers/profiles/${workerId}`,
      agentBaseUrl:
        entry.agentBaseUrl ??
        `http://worker-${workerId}:4020`,
      runtimeType: entry.runtimeType === "host" ? "host" : "docker",
      defaultStatus: normalizeWorkerStatus(entry.defaultStatus, "starting")
    };
  });
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlApiConfig {
  return {
    serviceName: env.CONTROL_API_NAME ?? "control-api",
    mode: env.CONTROL_API_MODE === "remote_relay" ? "remote_relay" : "full_app",
    host: env.CONTROL_API_HOST ?? "0.0.0.0",
    port: parseInteger(env.CONTROL_API_PORT, 4010),
    rolloutSmokeStatePath:
      env.ROLLOUT_SMOKE_STATE_PATH ?? DEFAULT_ROLLOUT_SMOKE_STATE_PATH,
    readinessRecoveryStatePath:
      env.READINESS_RECOVERY_STATE_PATH ??
      DEFAULT_READINESS_RECOVERY_STATE_PATH,
    postRecoveryRegressionStatePath:
      env.POST_RECOVERY_REGRESSION_STATE_PATH ??
      DEFAULT_POST_RECOVERY_REGRESSION_STATE_PATH,
    zeroReadyRootCauseStatePath:
      env.ZERO_READY_ROOT_CAUSE_STATE_PATH ??
      DEFAULT_ZERO_READY_ROOT_CAUSE_STATE_PATH,
    disconnectedBaselineRemediationStatePath:
      env.DISCONNECTED_BASELINE_REMEDIATION_STATE_PATH ??
      DEFAULT_DISCONNECTED_BASELINE_REMEDIATION_STATE_PATH,
    disconnectedRuntimeRemediationStatePath:
      env.DISCONNECTED_RUNTIME_REMEDIATION_STATE_PATH ??
      DEFAULT_DISCONNECTED_RUNTIME_REMEDIATION_STATE_PATH,
    persistentDisconnectedRuntimeFollowupStatePath:
      env.PERSISTENT_DISCONNECTED_RUNTIME_FOLLOWUP_STATE_PATH ??
      DEFAULT_PERSISTENT_DISCONNECTED_RUNTIME_FOLLOWUP_STATE_PATH,
    runtimeParityBackportRemediationStatePath:
      env.RUNTIME_PARITY_BACKPORT_REMEDIATION_STATE_PATH ??
      DEFAULT_RUNTIME_PARITY_BACKPORT_REMEDIATION_STATE_PATH,
    postParityDisconnectedRuntimeRemediationStatePath:
      env.POST_PARITY_DISCONNECTED_RUNTIME_REMEDIATION_STATE_PATH ??
      DEFAULT_POST_PARITY_DISCONNECTED_RUNTIME_REMEDIATION_STATE_PATH,
    postPhase21DisconnectedRuntimeFollowupStatePath:
      env.POST_PHASE21_DISCONNECTED_RUNTIME_FOLLOWUP_STATE_PATH ??
      DEFAULT_POST_PHASE21_DISCONNECTED_RUNTIME_FOLLOWUP_STATE_PATH,
    postPhase22SmokeWrapperParityRemediationStatePath:
      env.POST_PHASE22_SMOKE_WRAPPER_PARITY_REMEDIATION_STATE_PATH ??
      DEFAULT_POST_PHASE22_SMOKE_WRAPPER_PARITY_REMEDIATION_STATE_PATH,
    postPhase23ExactSmokeWrapperCompatRemediationStatePath:
      env.POST_PHASE23_EXACT_SMOKE_WRAPPER_COMPAT_REMEDIATION_STATE_PATH ??
      DEFAULT_POST_PHASE23_EXACT_SMOKE_WRAPPER_COMPAT_REMEDIATION_STATE_PATH,
    postPhase24ExternalApiReadinessStatePath:
      env.POST_PHASE24_EXTERNAL_API_READINESS_STATE_PATH ??
      DEFAULT_POST_PHASE24_EXTERNAL_API_READINESS_STATE_PATH,
    postPhase25ExternalRestorationStatePath:
      env.POST_PHASE25_EXTERNAL_RESTORATION_STATE_PATH ??
      DEFAULT_POST_PHASE25_EXTERNAL_RESTORATION_STATE_PATH,
    postPhase26UbuntuSshRecoveryStatePath:
      env.POST_PHASE26_UBUNTU_SSH_RECOVERY_STATE_PATH ??
      DEFAULT_POST_PHASE26_UBUNTU_SSH_RECOVERY_STATE_PATH,
    postPhase27LocalProxyBootstrapStatePath:
      env.POST_PHASE27_LOCAL_PROXY_BOOTSTRAP_STATE_PATH ??
      DEFAULT_POST_PHASE27_LOCAL_PROXY_BOOTSTRAP_STATE_PATH,
    postPhase28LocalProxyTransportStatePath:
      env.POST_PHASE28_LOCAL_PROXY_TRANSPORT_STATE_PATH ??
      DEFAULT_POST_PHASE28_LOCAL_PROXY_TRANSPORT_STATE_PATH,
    postPhase29Shared2Chat409StatePath:
      env.POST_PHASE29_SHARED2_CHAT_409_STATE_PATH ??
      DEFAULT_POST_PHASE29_SHARED2_CHAT_409_STATE_PATH,
    postPhase30Shared2BootstrapRecoveryStatePath:
      env.POST_PHASE30_SHARED2_BOOTSTRAP_RECOVERY_STATE_PATH ??
      DEFAULT_POST_PHASE30_SHARED2_BOOTSTRAP_RECOVERY_STATE_PATH,
    postPhase31AccountSurfaceInventoryStatePath:
      env.POST_PHASE31_ACCOUNT_SURFACE_INVENTORY_STATE_PATH ??
      DEFAULT_POST_PHASE31_ACCOUNT_SURFACE_INVENTORY_STATE_PATH,
    postPhase31SelectedCanaryChatRecoveryStatePath:
      env.POST_PHASE31_SELECTED_CANARY_CHAT_RECOVERY_STATE_PATH ??
      DEFAULT_POST_PHASE31_SELECTED_CANARY_CHAT_RECOVERY_STATE_PATH,
    postPhase32RotatingReadyAccountChatProofStatePath:
      env.POST_PHASE32_ROTATING_READY_ACCOUNT_CHAT_PROOF_STATE_PATH ??
      DEFAULT_POST_PHASE32_ROTATING_READY_ACCOUNT_CHAT_PROOF_STATE_PATH,
    postPhase33AccountBrowserIsolationStatePath:
      env.POST_PHASE33_ACCOUNT_BROWSER_ISOLATION_STATE_PATH ??
      DEFAULT_POST_PHASE33_ACCOUNT_BROWSER_ISOLATION_STATE_PATH,
    postPhase33IsolatedExternalChatProofStatePath:
      env.POST_PHASE33_ISOLATED_EXTERNAL_CHAT_PROOF_STATE_PATH ??
      DEFAULT_POST_PHASE33_ISOLATED_EXTERNAL_CHAT_PROOF_STATE_PATH,
    postPhase34ServerIsolatedChatTransferStatePath:
      env.POST_PHASE34_SERVER_ISOLATED_CHAT_TRANSFER_STATE_PATH ??
      DEFAULT_POST_PHASE34_SERVER_ISOLATED_CHAT_TRANSFER_STATE_PATH,
    postPhase35ServerTokenSshListenerRecoveryStatePath:
      env.POST_PHASE35_SERVER_TOKEN_SSH_LISTENER_RECOVERY_STATE_PATH ??
      DEFAULT_POST_PHASE35_SERVER_TOKEN_SSH_LISTENER_RECOVERY_STATE_PATH,
    postPhase36ReverseTunnelChatSmokeStatePath:
      env.POST_PHASE36_REVERSE_TUNNEL_CHAT_SMOKE_STATE_PATH ??
      DEFAULT_POST_PHASE36_REVERSE_TUNNEL_CHAT_SMOKE_STATE_PATH,
    postRemediationDegradedSmokeStatePath:
      env.POST_REMEDIATION_DEGRADED_SMOKE_STATE_PATH ??
      DEFAULT_POST_REMEDIATION_DEGRADED_SMOKE_STATE_PATH,
    postStabilizationRuntimeInvestigationStatePath:
      env.POST_STABILIZATION_RUNTIME_INVESTIGATION_STATE_PATH ??
      DEFAULT_POST_STABILIZATION_RUNTIME_INVESTIGATION_STATE_PATH,
    remoteRelayDefaultWorkerId: env.REMOTE_RELAY_DEFAULT_WORKER_ID?.trim() || undefined,
    internalAdminToken: env.INTERNAL_ADMIN_TOKEN,
    remoteRelayApiToken: env.REMOTE_RELAY_API_TOKEN,
    remoteRelayRequestTimeoutMs: parseInteger(
      env.REMOTE_RELAY_REQUEST_TIMEOUT_MS,
      180_000
    ),
    remoteRelayTopologyHint: env.REMOTE_RELAY_TOPOLOGY_HINT ?? "pending",
    hostControllerBaseUrl: env.HOST_CONTROLLER_BASE_URL,
    hostControllerToken: env.HOST_CONTROLLER_TOKEN,
    autoStartHostWorkers: parseBoolean(env.AUTO_START_HOST_WORKERS, true),
    sessionDatabasePath:
      env.SESSION_DB_PATH ?? DEFAULT_SESSION_DATABASE_PATH,
    sessionDurationMinutes: parseInteger(env.SESSION_DURATION_MINUTES, 60),
    sessionSweepIntervalMs: parseInteger(env.SESSION_SWEEP_INTERVAL_MS, 5_000),
    sessionClientDistPath:
      env.SESSION_CLIENT_DIST_PATH ?? DEFAULT_SESSION_CLIENT_DIST_PATH,
    dockerSocketPath:
      env.DOCKER_SOCKET_PATH ?? DEFAULT_DOCKER_SOCKET_PATH,
    workerHealthPollIntervalMs: parseInteger(
      env.WORKER_HEALTH_POLL_INTERVAL_MS,
      5_000
    ),
    workerHealthTimeoutMs: parseInteger(
      env.WORKER_HEALTH_TIMEOUT_MS,
      3_000
    ),
    workerDefinitions: parseWorkerDefinitions(env.WORKER_DEFINITIONS) ?? DEFAULT_WORKERS
  };
}
