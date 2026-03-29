import type { WorkerDefinition, WorkerRuntimeType } from "../config.js";
import {
  createWorkerStatusRecord,
  type WorkerStatus,
  type WorkerStatusRecord
} from "./worker-status.js";

export type WorkerRuntimeCapability =
  | "unreachable"
  | "reachable_but_unusable"
  | "usable";

export interface WorkerRecord {
  workerId: string;
  displayName: string;
  containerName: string;
  profilePath: string;
  agentBaseUrl: string;
  runtimeType: WorkerRuntimeType;
  status: WorkerStatusRecord;
  runtimeStatus?: WorkerStatus;
  assignedSessionId?: string;
  assignedUserLabel?: string;
  lastSeenAt?: string;
  lastAssignedAt?: string;
  recoverySessionId?: string;
  runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop";
  runtimeClass?:
    | "host_visible_auth"
    | "host_hidden_runtime"
    | "host_alternate_desktop"
    | "docker_headed_xvfb";
  runtimeDesktopName?: string;
  headless?: boolean;
  cdpAttached?: boolean;
  proxyServerConfigured?: boolean;
  browserContextReady?: boolean;
  lastBootstrapAt?: string | null;
  lastBootstrapFailureCode?: string | null;
  lastBootstrapStep?:
    | "navigation"
    | "auth_check"
    | "surface_entry"
    | "new_chat"
    | "temporary_entry"
    | "temporary_confirmation"
    | "temporary_onboarding"
    | "model_selection"
    | "composer_ready"
    | "complete"
    | null;
  lastBootstrapUsability?:
    | "usable"
    | "auth_required"
    | "challenge_blocked"
    | "surface_unusable"
    | null;
  lastRelayAt?: string | null;
  lastRelayFailureCode?: string | null;
  runtimeCapability?: WorkerRuntimeCapability;
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
  runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop" | null;
  runtimeClass?:
    | "host_visible_auth"
    | "host_hidden_runtime"
    | "host_alternate_desktop"
    | "docker_headed_xvfb"
    | null;
  runtimeDesktopName?: string | null;
  headless?: boolean | null;
  cdpAttached?: boolean | null;
  proxyServerConfigured?: boolean | null;
  browserContextReady?: boolean | null;
  lastBootstrapAt?: string | null;
  lastBootstrapFailureCode?: string | null;
  lastBootstrapStep?:
    | "navigation"
    | "auth_check"
    | "surface_entry"
    | "new_chat"
    | "temporary_entry"
    | "temporary_confirmation"
    | "temporary_onboarding"
    | "model_selection"
    | "composer_ready"
    | "complete"
    | null;
  lastBootstrapUsability?:
    | "usable"
    | "auth_required"
    | "challenge_blocked"
    | "surface_unusable"
    | null;
  lastRelayAt?: string | null;
  lastRelayFailureCode?: string | null;
  runtimeCapability?: WorkerRuntimeCapability | null;
}

function defaultRuntimeCapabilityForStatus(
  status: WorkerStatus
): WorkerRuntimeCapability {
  return status === "disconnected"
    ? "unreachable"
    : "reachable_but_unusable";
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
        runtimeType: definition.runtimeType ?? "docker",
        status: createWorkerStatusRecord(definition.defaultStatus, "registry bootstrap"),
        runtimeStatus: definition.defaultStatus,
        runtimeMode:
          definition.runtimeType === "host" ? "alternate_desktop" : undefined,
        runtimeClass:
          definition.runtimeType === "host"
            ? "host_alternate_desktop"
            : undefined,
        runtimeCapability: defaultRuntimeCapabilityForStatus(definition.defaultStatus),
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
          : update.recoverySessionId ?? existing.recoverySessionId,
      runtimeMode:
        update.runtimeMode === null
          ? undefined
          : update.runtimeMode ?? existing.runtimeMode,
      runtimeClass:
        update.runtimeClass === null
          ? undefined
          : update.runtimeClass ?? existing.runtimeClass,
      runtimeDesktopName:
        update.runtimeDesktopName === null
          ? undefined
          : update.runtimeDesktopName ?? existing.runtimeDesktopName,
      headless:
        update.headless === null
          ? undefined
          : update.headless ?? existing.headless,
      cdpAttached:
        update.cdpAttached === null
          ? undefined
          : update.cdpAttached ?? existing.cdpAttached,
      proxyServerConfigured:
        update.proxyServerConfigured === null
          ? undefined
          : update.proxyServerConfigured ?? existing.proxyServerConfigured,
      browserContextReady:
        update.browserContextReady === null
          ? undefined
          : update.browserContextReady ?? existing.browserContextReady,
      lastBootstrapAt:
        update.lastBootstrapAt === null
          ? undefined
          : update.lastBootstrapAt ?? existing.lastBootstrapAt,
      lastBootstrapFailureCode:
        update.lastBootstrapFailureCode === null
          ? undefined
          : update.lastBootstrapFailureCode ?? existing.lastBootstrapFailureCode,
      lastBootstrapStep:
        update.lastBootstrapStep === null
          ? undefined
          : update.lastBootstrapStep ?? existing.lastBootstrapStep,
      lastBootstrapUsability:
        update.lastBootstrapUsability === null
          ? undefined
          : update.lastBootstrapUsability ?? existing.lastBootstrapUsability,
      lastRelayAt:
        update.lastRelayAt === null
          ? undefined
          : update.lastRelayAt ?? existing.lastRelayAt,
      lastRelayFailureCode:
        update.lastRelayFailureCode === null
          ? undefined
          : update.lastRelayFailureCode ?? existing.lastRelayFailureCode,
      runtimeCapability:
        update.runtimeCapability === null
          ? undefined
          : update.runtimeCapability ?? existing.runtimeCapability
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
