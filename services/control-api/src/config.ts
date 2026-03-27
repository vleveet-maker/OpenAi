import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeWorkerStatus,
  type WorkerStatus
} from "./workers/worker-status.js";

export interface WorkerDefinition {
  workerId: string;
  displayName: string;
  containerName: string;
  profilePath: string;
  agentBaseUrl: string;
  defaultStatus: WorkerStatus;
}

export interface ControlApiConfig {
  serviceName: string;
  host: string;
  port: number;
  internalAdminToken?: string;
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
const DEFAULT_DOCKER_SOCKET_PATH = "/var/run/docker.sock";

const DEFAULT_WORKERS: WorkerDefinition[] = [
  {
    workerId: "dad",
    displayName: "Dad",
    containerName: "worker-dad",
    profilePath: "/srv/chatgpt-workers/profiles/dad",
    agentBaseUrl: "http://worker-dad:4020",
    defaultStatus: "starting"
  },
  {
    workerId: "wife",
    displayName: "Wife",
    containerName: "worker-wife",
    profilePath: "/srv/chatgpt-workers/profiles/wife",
    agentBaseUrl: "http://worker-wife:4020",
    defaultStatus: "starting"
  },
  {
    workerId: "shared-1",
    displayName: "Shared 1",
    containerName: "worker-shared-1",
    profilePath: "/srv/chatgpt-workers/profiles/shared-1",
    agentBaseUrl: "http://worker-shared-1:4020",
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
      defaultStatus: normalizeWorkerStatus(entry.defaultStatus, "starting")
    };
  });
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlApiConfig {
  return {
    serviceName: env.CONTROL_API_NAME ?? "control-api",
    host: env.CONTROL_API_HOST ?? "0.0.0.0",
    port: parseInteger(env.CONTROL_API_PORT, 4010),
    internalAdminToken: env.INTERNAL_ADMIN_TOKEN,
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
