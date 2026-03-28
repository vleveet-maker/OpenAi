import type { OperatorEventRecorder } from "../observability/operator-events.js";
import type { SessionService } from "../sessions/session-service.js";
import type { WorkerStatus } from "./worker-status.js";
import type {
  WorkerRecord,
  WorkerRegistry,
  WorkerRuntimeCapability
} from "./worker-registry.js";

interface WorkerHealthPayload {
  runtimeStatus?: WorkerStatus;
  browserContextReady?: boolean;
  lastRelayAt?: string | null;
  lastRelayFailureCode?: string | null;
  runtimeMode?: "visible_auth" | "hidden_runtime";
  headless?: boolean;
  cdpAttached?: boolean;
  proxyServerConfigured?: boolean;
}

export interface WorkerHealthMonitorOptions {
  workerRegistry: WorkerRegistry;
  sessionService: Pick<SessionService, "handleWorkerReady" | "handleWorkerStatusChange">;
  pollIntervalMs: number;
  timeoutMs: number;
  eventRecorder?: OperatorEventRecorder;
}

function isChallengeOrAuthFailureCode(
  failureCode: string | null | undefined
): boolean {
  if (!failureCode) {
    return false;
  }

  return [
    "bootstrap_auth_required",
    "bootstrap_challenge_detected",
    "bootstrap_surface_unusable"
  ].includes(failureCode) || /auth|challenge|reauth|captcha|cloudflare/i.test(failureCode);
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
      const runtimeCapability = this.resolveRuntimeCapability(
        payload,
        nextStatus
      );
      this.options.workerRegistry.updateWorker(worker.workerId, {
        status: nextStatus,
        reason: "worker health poll succeeded",
        runtimeStatus: payload.runtimeStatus ?? nextStatus,
        runtimeMode: payload.runtimeMode ?? null,
        headless: payload.headless ?? null,
        cdpAttached: payload.cdpAttached ?? null,
        proxyServerConfigured: payload.proxyServerConfigured ?? null,
        browserContextReady: payload.browserContextReady ?? null,
        lastRelayAt: payload.lastRelayAt ?? null,
        lastRelayFailureCode: payload.lastRelayFailureCode ?? null,
        runtimeCapability,
        lastSeenAt: checkedAt
      });

      if (nextStatus !== previousStatus) {
        const hiddenRuntimeAuthLost =
          nextStatus === "reauth_required" &&
          payload.runtimeMode === "hidden_runtime";
        this.options.eventRecorder?.recordEvent({
          eventType: "worker_status_changed",
          severity:
            nextStatus === "disconnected"
              ? "error"
              : nextStatus === "reauth_required"
                ? "warn"
                : "info",
          workerId: worker.workerId,
          summary: hiddenRuntimeAuthLost
            ? `Worker ${worker.workerId} hidden runtime lost auth after manual login; architecture review required`
            : `Worker ${worker.workerId} status changed from ${previousStatus} to ${nextStatus}`,
          detailJson: JSON.stringify({
            previousStatus,
            nextStatus,
            runtimeStatus: payload.runtimeStatus ?? nextStatus,
            runtimeMode: payload.runtimeMode ?? null,
            headless: payload.headless ?? null,
            cdpAttached: payload.cdpAttached ?? null,
            proxyServerConfigured: payload.proxyServerConfigured ?? null,
            browserContextReady: payload.browserContextReady ?? null,
            lastRelayAt: payload.lastRelayAt ?? null,
            lastRelayFailureCode: payload.lastRelayFailureCode ?? null
          }),
          occurredAt: checkedAt
        });
      }

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
        runtimeStatus: "disconnected",
        browserContextReady: false,
        runtimeCapability: "unreachable"
      });

      if (previousStatus !== "disconnected") {
        this.options.eventRecorder?.recordEvent({
          eventType: "worker_status_changed",
          severity: "error",
          workerId: worker.workerId,
          summary: `Worker ${worker.workerId} status changed from ${previousStatus} to disconnected`,
          detailJson: JSON.stringify({
            previousStatus,
            nextStatus: "disconnected",
            failureCount: failedCount
          }),
          occurredAt: now.toISOString()
        });
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

  private resolveRuntimeCapability(
    payload: WorkerHealthPayload,
    nextStatus: WorkerStatus
  ): WorkerRuntimeCapability {
    if (nextStatus === "disconnected" || payload.runtimeStatus === "disconnected") {
      return "unreachable";
    }

    if (isChallengeOrAuthFailureCode(payload.lastRelayFailureCode)) {
      return "reachable_but_unusable";
    }

    if (
      payload.lastRelayAt &&
      !payload.lastRelayFailureCode &&
      nextStatus !== "reauth_required"
    ) {
      return "usable";
    }

    if (
      payload.browserContextReady === true ||
      payload.browserContextReady === false ||
      nextStatus === "starting" ||
      nextStatus === "reauth_required"
    ) {
      return "reachable_but_unusable";
    }

    return "unreachable";
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
