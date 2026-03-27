import { randomUUID } from "node:crypto";

import type { WorkerRegistry, WorkerRecord } from "../workers/worker-registry.js";
import { isWorkerRecoverable } from "../workers/worker-status.js";
import { SessionStore } from "./session-store.js";
import {
  getSessionStateForEndReason,
  type PublicWorkerSummary,
  type SessionEndReason,
  type SessionRecord,
  type SessionSnapshot
} from "./session-types.js";

export interface SessionServiceOptions {
  store: SessionStore;
  workerRegistry: WorkerRegistry;
  sessionDurationMinutes: number;
  sweepIntervalMs: number;
}

export class SessionService {
  private backgroundSweep?: NodeJS.Timeout;

  constructor(private readonly options: SessionServiceOptions) {}

  bootstrap(now: Date = new Date()): void {
    const nowIso = now.toISOString();
    const lastAssignedAtByWorker = this.options.store.getLastAssignedAtByWorker();

    for (const [workerId, lastAssignedAt] of Object.entries(lastAssignedAtByWorker)) {
      if (this.options.workerRegistry.getWorker(workerId)) {
        this.options.workerRegistry.updateWorker(workerId, {
          lastAssignedAt,
          lastSeenAt: nowIso
        });
      }
    }

    for (const session of this.options.store.getNonTerminalSessions()) {
      if (session.state === "queued") {
        continue;
      }

      if (!session.workerId) {
        this.finalizeSession(session, "worker_unavailable", now);
        continue;
      }

      if (session.endsAt && session.endsAt <= nowIso) {
        this.finalizeSession(session, "timer_expired", now);
        continue;
      }

      const worker = this.options.workerRegistry.getWorker(session.workerId);

      if (!worker) {
        this.finalizeSession(session, "worker_unavailable", now);
        continue;
      }

      this.options.workerRegistry.updateWorker(worker.workerId, {
        status: "busy",
        reason: "session rehydrated after control-api bootstrap",
        assignedSessionId: session.sessionId,
        assignedUserLabel: session.requestedForLabel,
        lastAssignedAt: session.startedAt ?? nowIso,
        lastSeenAt: nowIso
      });
    }

    this.reconcileQueue(now);
  }

  startBackgroundSweep(): void {
    if (this.backgroundSweep) {
      return;
    }

    this.backgroundSweep = setInterval(() => {
      this.runSweep();
    }, this.options.sweepIntervalMs);

    this.backgroundSweep.unref();
  }

  stopBackgroundSweep(): void {
    if (!this.backgroundSweep) {
      return;
    }

    clearInterval(this.backgroundSweep);
    this.backgroundSweep = undefined;
  }

  close(): void {
    this.stopBackgroundSweep();
    this.options.store.close();
  }

  createSession(requestedForLabel: string, now: Date = new Date()): SessionSnapshot {
    const session: SessionRecord = {
      sessionId: randomUUID(),
      requestedForLabel,
      state: "queued",
      workerId: null,
      queuedAt: now.toISOString(),
      startedAt: null,
      endsAt: null,
      endedAt: null,
      endReason: null
    };

    this.options.store.insertSession(session);
    this.reconcileQueue(now);

    return this.requireSessionSnapshot(session.sessionId);
  }

  getSessionSnapshot(sessionId: string): SessionSnapshot | undefined {
    const session = this.options.store.getSession(sessionId);

    if (!session) {
      return undefined;
    }

    return {
      session,
      queuePosition: this.options.store.getQueuePosition(sessionId),
      worker: this.getWorkerSummary(session)
    };
  }

  cancelQueuedSession(
    sessionId: string,
    now: Date = new Date()
  ): SessionSnapshot | undefined {
    const session = this.options.store.getSession(sessionId);

    if (!session || session.state !== "queued") {
      return undefined;
    }

    this.finalizeSession(session, "cancelled", now);
    return this.requireSessionSnapshot(sessionId);
  }

  endActiveSession(
    sessionId: string,
    reason: Extract<SessionEndReason, "manual_end" | "timer_expired" | "worker_unavailable">,
    now: Date = new Date()
  ): SessionSnapshot | undefined {
    const session = this.options.store.getSession(sessionId);

    if (!session || session.state !== "active") {
      return undefined;
    }

    this.finalizeSession(session, reason, now);
    return this.requireSessionSnapshot(sessionId);
  }

  endActiveSessionForWorker(
    workerId: string,
    reason: Extract<SessionEndReason, "worker_unavailable" | "timer_expired">,
    now: Date = new Date()
  ): SessionSnapshot | undefined {
    const session = this.options.store.getActiveSessionByWorker(workerId);

    if (!session) {
      return undefined;
    }

    return this.endActiveSession(session.sessionId, reason, now);
  }

  hasActiveSessionForWorker(workerId: string): boolean {
    return Boolean(this.options.store.getActiveSessionByWorker(workerId));
  }

  handleWorkerReady(now: Date = new Date()): void {
    this.reconcileQueue(now);
  }

  handleWorkerStatusChange(workerId: string, now: Date = new Date()): void {
    const worker = this.options.workerRegistry.getWorker(workerId);

    if (!worker) {
      return;
    }

    if (worker.status.status === "ready") {
      this.reconcileQueue(now);
      return;
    }

    if (isWorkerRecoverable(worker.status.status)) {
      this.endActiveSessionForWorker(workerId, "worker_unavailable", now);
    }
  }

  runSweep(now: Date = new Date()): void {
    const nowIso = now.toISOString();

    for (const session of this.options.store.getActiveSessions()) {
      if (session.endsAt && session.endsAt <= nowIso) {
        this.finalizeSession(session, "timer_expired", now);
        continue;
      }

      if (!session.workerId) {
        this.finalizeSession(session, "worker_unavailable", now);
        continue;
      }

      const worker = this.options.workerRegistry.getWorker(session.workerId);

      if (!worker || isWorkerRecoverable(worker.status.status)) {
        this.finalizeSession(session, "worker_unavailable", now);
      }
    }

    this.reconcileQueue(now);
  }

  private requireSessionSnapshot(sessionId: string): SessionSnapshot {
    const snapshot = this.getSessionSnapshot(sessionId);

    if (!snapshot) {
      throw new Error(`Session not found after update: ${sessionId}`);
    }

    return snapshot;
  }

  private reconcileQueue(now: Date = new Date()): void {
    while (true) {
      const nextQueuedSession = this.options.store.getNextQueuedSession();
      const worker = this.pickReadyWorker();

      if (!nextQueuedSession || !worker) {
        return;
      }

      this.activateSession(nextQueuedSession, worker, now);
      now = new Date(now.getTime() + 1);
    }
  }

  private activateSession(
    session: SessionRecord,
    worker: WorkerRecord,
    now: Date
  ): void {
    const startedAt = now.toISOString();
    const endsAt = new Date(
      now.getTime() + this.options.sessionDurationMinutes * 60_000
    ).toISOString();

    const updatedSession: SessionRecord = {
      ...session,
      state: "active",
      workerId: worker.workerId,
      startedAt,
      endsAt
    };

    this.options.store.updateSession(updatedSession);
    this.options.workerRegistry.updateWorker(worker.workerId, {
      status: "busy",
      reason: `session ${updatedSession.sessionId} activated`,
      assignedSessionId: updatedSession.sessionId,
      assignedUserLabel: updatedSession.requestedForLabel,
      lastAssignedAt: startedAt,
      lastSeenAt: startedAt
    });
  }

  private finalizeSession(
    session: SessionRecord,
    reason: SessionEndReason,
    now: Date
  ): void {
    const nowIso = now.toISOString();
    const updatedSession: SessionRecord = {
      ...session,
      state: getSessionStateForEndReason(reason),
      endedAt: nowIso,
      endReason: reason
    };

    this.options.store.updateSession(updatedSession);

    if (session.workerId) {
      this.releaseWorker(session.workerId, nowIso, reason);
    }

    this.reconcileQueue(now);
  }

  private releaseWorker(
    workerId: string,
    nowIso: string,
    reason: SessionEndReason
  ): void {
    const worker = this.options.workerRegistry.getWorker(workerId);

    if (!worker) {
      return;
    }

    const shouldReturnToReady = worker.status.status === "busy";

    this.options.workerRegistry.updateWorker(worker.workerId, {
      status: shouldReturnToReady ? "ready" : worker.status.status,
      reason: shouldReturnToReady ? `session ${reason}` : worker.status.reason,
      assignedSessionId: null,
      assignedUserLabel: null,
      lastSeenAt: nowIso
    });
  }

  private pickReadyWorker(): WorkerRecord | undefined {
    return this.options.workerRegistry
      .listReadyWorkers()
      .filter((worker) => !worker.assignedSessionId)
      .sort((left, right) => {
        if (!left.lastAssignedAt && !right.lastAssignedAt) {
          return left.workerId.localeCompare(right.workerId);
        }

        if (!left.lastAssignedAt) {
          return -1;
        }

        if (!right.lastAssignedAt) {
          return 1;
        }

        const byRecency = left.lastAssignedAt.localeCompare(right.lastAssignedAt);
        return byRecency !== 0
          ? byRecency
          : left.workerId.localeCompare(right.workerId);
      })[0];
  }

  private getWorkerSummary(session: SessionRecord): PublicWorkerSummary | null {
    if (!session.workerId) {
      return null;
    }

    const worker = this.options.workerRegistry.getWorker(session.workerId);

    if (!worker) {
      return null;
    }

    return {
      workerId: worker.workerId,
      displayName: worker.displayName,
      status: worker.status.status
    };
  }
}

export function createSessionService(options: SessionServiceOptions): SessionService {
  return new SessionService(options);
}
