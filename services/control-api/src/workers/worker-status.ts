export const WORKER_STATUSES = [
  "starting",
  "ready",
  "busy",
  "disconnected",
  "reauth_required"
] as const;

export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export interface WorkerStatusRecord {
  status: WorkerStatus;
  updatedAt: string;
  reason?: string;
}

export function normalizeWorkerStatus(
  value: string | undefined,
  fallback: WorkerStatus = "starting"
): WorkerStatus {
  if (!value) {
    return fallback;
  }

  if (WORKER_STATUSES.includes(value as WorkerStatus)) {
    return value as WorkerStatus;
  }

  return fallback;
}

export function createWorkerStatusRecord(
  status: WorkerStatus,
  reason?: string
): WorkerStatusRecord {
  return {
    status,
    updatedAt: new Date().toISOString(),
    reason
  };
}

export function isWorkerReady(status: WorkerStatus): boolean {
  return status === "ready";
}

export function isWorkerRecoverable(status: WorkerStatus): boolean {
  return status === "disconnected" || status === "reauth_required";
}
