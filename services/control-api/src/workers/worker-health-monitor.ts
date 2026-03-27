import type { SessionService } from "../sessions/session-service.js";
import type { WorkerStatus } from "./worker-status.js";
import type { WorkerRecord, WorkerRegistry } from "./worker-registry.js";

interface WorkerHealthPayload {
  runtimeStatus?: WorkerStatus;
  browserContextReady?: boolean;
  lastRelayAt?: string | null;
  lastRelayFailureCode?: string | null;
}

export interface WorkerHealthMonitorOptions {
  workerRegistry: WorkerRegistry;
  sessionService: Pick<SessionService, "handleWorkerReady" | "handleWorkerStatusChange">;
  pollIntervalMs: number;
  timeoutMs: number;
}

export class WorkerHealthMonitor {
  private interval?: NodeJS.Timeout;
  private readonly consecutiveFailures = new Map<string, number>();

  constructor(private readonly options: WorkerHealthMonitorOptions) {}

  startHealthMonitor(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      void this.runHealthSweep();
    }, this.options.pollIntervalMs);

    this.interval.unref();
  }

  stopHealthMonitor(): void {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;
  }

  async runHealthSweep(now: Date = new Date()): Promise<void> {
    const workers = this.options.workerRegistry.listWorkers();

    for (const worker of workers) {
      await this.pollWorker(worker, now);
    }
  }

  private async pollWorker(worker: WorkerRecord, now: Date): Promise<void> {
    try {
      const payload = await this.fetchWorkerHealth(worker);
      const nextStatus = this.resolveWorkerStatus(worker, payload);
      const previousStatus = worker.status.status;
      const checkedAt = now.toISOString();

      this.consecutiveFailures.set(worker.workerId, 0);
      this.options.workerRegistry.updateWorker(worker.workerId, {
        status: nextStatus,
        reason: "worker health poll succeeded",
        runtimeStatus: payload.runtimeStatus ?? nextStatus,
        lastSeenAt: checkedAt
      });

      if (nextStatus === "ready" && previousStatus !== "ready") {
        this.options.sessionService.handleWorkerReady(now);
      } else if (
        nextStatus !== previousStatus &&
        (nextStatus === "disconnected" || nextStatus === "reauth_required")
      ) {
        this.options.sessionService.handleWorkerStatusChange(worker.workerId, now);
      }
    } catch {
      const failedCount = (this.consecutiveFailures.get(worker.workerId) ?? 0) + 1;
      this.consecutiveFailures.set(worker.workerId, failedCount);

      if (failedCount < 2) {
        return;
      }

      const previousStatus = worker.status.status;
      this.options.workerRegistry.updateWorker(worker.workerId, {
        status: "disconnected",
        reason: "worker health poll failed twice",
        runtimeStatus: "disconnected"
      });

      if (previousStatus !== "disconnected") {
        this.options.sessionService.handleWorkerStatusChange(worker.workerId, now);
      }
    }
  }

  private resolveWorkerStatus(
    worker: WorkerRecord,
    payload: WorkerHealthPayload
  ): WorkerStatus {
    if (payload.runtimeStatus === "reauth_required") {
      return "reauth_required";
    }

    if (payload.runtimeStatus === "disconnected") {
      return "disconnected";
    }

    if (payload.runtimeStatus === "starting" || payload.browserContextReady === false) {
      return "starting";
    }

    if (worker.assignedSessionId) {
      return "busy";
    }

    return payload.runtimeStatus ?? "ready";
  }

  private async fetchWorkerHealth(worker: WorkerRecord): Promise<WorkerHealthPayload> {
    const response = await fetch(new URL("/health", `${worker.agentBaseUrl}/`), {
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Worker health request failed with status ${response.status}`);
    }

    return (await response.json()) as WorkerHealthPayload;
  }
}

export function createWorkerHealthMonitor(
  options: WorkerHealthMonitorOptions
): WorkerHealthMonitor {
  return new WorkerHealthMonitor(options);
}
