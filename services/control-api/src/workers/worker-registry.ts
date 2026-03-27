import type { WorkerDefinition } from "../config.js";
import {
  createWorkerStatusRecord,
  type WorkerStatus,
  type WorkerStatusRecord
} from "./worker-status.js";

export interface WorkerRecord {
  workerId: string;
  displayName: string;
  containerName: string;
  profilePath: string;
  agentBaseUrl: string;
  status: WorkerStatusRecord;
  runtimeStatus?: WorkerStatus;
  assignedSessionId?: string;
  assignedUserLabel?: string;
  lastSeenAt?: string;
  lastAssignedAt?: string;
  recoverySessionId?: string;
}

export interface WorkerRegistryUpdate {
  status?: WorkerStatus;
  reason?: string;
  runtimeStatus?: WorkerStatus | null;
  assignedSessionId?: string | null;
  assignedUserLabel?: string | null;
  lastSeenAt?: string;
  lastAssignedAt?: string | null;
  recoverySessionId?: string | null;
}

function cloneWorkerRecord(record: WorkerRecord): WorkerRecord {
  return {
    ...record,
    status: {
      ...record.status
    }
  };
}

export class WorkerRegistry {
  private readonly workers = new Map<string, WorkerRecord>();

  constructor(workerDefinitions: WorkerDefinition[]) {
    for (const definition of workerDefinitions) {
      const now = new Date().toISOString();

      this.workers.set(definition.workerId, {
        workerId: definition.workerId,
        displayName: definition.displayName,
        containerName: definition.containerName,
        profilePath: definition.profilePath,
        agentBaseUrl: definition.agentBaseUrl,
        status: createWorkerStatusRecord(definition.defaultStatus, "registry bootstrap"),
        runtimeStatus: definition.defaultStatus,
        lastSeenAt: now
      });
    }
  }

  listWorkers(): WorkerRecord[] {
    return Array.from(this.workers.values()).map(cloneWorkerRecord);
  }

  getWorker(workerId: string): WorkerRecord | undefined {
    const worker = this.workers.get(workerId);
    return worker ? cloneWorkerRecord(worker) : undefined;
  }

  getWorkerStatus(workerId: string): WorkerStatusRecord | undefined {
    const worker = this.workers.get(workerId);
    return worker
      ? {
          ...worker.status
        }
      : undefined;
  }

  listReadyWorkers(): WorkerRecord[] {
    return this.listWorkers().filter((worker) => worker.status.status === "ready");
  }

  updateWorker(workerId: string, update: WorkerRegistryUpdate): WorkerRecord {
    const existing = this.workers.get(workerId);

    if (!existing) {
      throw new Error(`Unknown workerId: ${workerId}`);
    }

    const updated: WorkerRecord = {
      ...existing,
      status:
        update.status !== undefined
          ? createWorkerStatusRecord(update.status, update.reason)
          : existing.status,
      runtimeStatus:
        update.runtimeStatus === null
          ? undefined
          : update.runtimeStatus ?? existing.runtimeStatus,
      assignedSessionId:
        update.assignedSessionId === null
          ? undefined
          : update.assignedSessionId ?? existing.assignedSessionId,
      assignedUserLabel:
        update.assignedUserLabel === null
          ? undefined
          : update.assignedUserLabel ?? existing.assignedUserLabel,
      lastSeenAt: update.lastSeenAt ?? new Date().toISOString(),
      lastAssignedAt:
        update.lastAssignedAt === null
          ? undefined
          : update.lastAssignedAt ?? existing.lastAssignedAt,
      recoverySessionId:
        update.recoverySessionId === null
          ? undefined
          : update.recoverySessionId ?? existing.recoverySessionId
    };

    this.workers.set(workerId, updated);
    return cloneWorkerRecord(updated);
  }
}

export function createWorkerRegistry(
  workerDefinitions: WorkerDefinition[]
): WorkerRegistry {
  return new WorkerRegistry(workerDefinitions);
}
