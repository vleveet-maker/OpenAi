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
