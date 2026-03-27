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
  workerDefinitions: WorkerDefinition[];
}

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

  return parsed.map((entry) => ({
    workerId: entry.workerId,
    displayName: entry.displayName ?? entry.workerId,
    containerName: entry.containerName ?? `worker-${entry.workerId}`,
    profilePath:
      entry.profilePath ??
      `/srv/chatgpt-workers/profiles/${entry.workerId}`,
    agentBaseUrl:
      entry.agentBaseUrl ??
      `http://worker-${entry.workerId}:4020`,
    defaultStatus: normalizeWorkerStatus(entry.defaultStatus, "starting")
  }));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlApiConfig {
  return {
    serviceName: env.CONTROL_API_NAME ?? "control-api",
    host: env.CONTROL_API_HOST ?? "0.0.0.0",
    port: parseInteger(env.CONTROL_API_PORT, 4010),
    internalAdminToken: env.INTERNAL_ADMIN_TOKEN,
    workerDefinitions: parseWorkerDefinitions(env.WORKER_DEFINITIONS) ?? DEFAULT_WORKERS
  };
}
