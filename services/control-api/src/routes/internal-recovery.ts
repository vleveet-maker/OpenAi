import { Router } from "express";

import type { SessionService } from "../sessions/session-service.js";
import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface InternalRecoverySession {
  sessionId: string;
  workerId: string;
  startedAt: string;
  expiresAt: string;
  status:
    | "requested"
    | "browser_ready"
    | "waiting_for_operator"
    | "completed"
    | "expired"
    | "cancelled";
  mode: "first_login" | "reauth";
}

export interface InternalRecoveryRouterOptions {
  workerRegistry: WorkerRegistry;
  recoverySessions: Map<string, InternalRecoverySession>;
  sessionService: SessionService;
}

function createInternalRecoverySession(workerId: string): InternalRecoverySession {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 15 * 60_000);

  return {
    sessionId: `reauth-${workerId}-${startedAt.getTime()}`,
    workerId,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "waiting_for_operator",
    mode: "reauth"
  };
}

function findWorkerRecoverySession(
  recoverySessions: Map<string, InternalRecoverySession>,
  workerId: string
): InternalRecoverySession | undefined {
  return Array.from(recoverySessions.values())
    .filter((session) => session.workerId === workerId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
}

export function createInternalRecoveryRouter(
  options: InternalRecoveryRouterOptions
) {
  const router = Router();

  router.post("/internal/workers/:id/reauth/start", (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
      return;
    }

    const session = createInternalRecoverySession(worker.workerId);

    options.recoverySessions.set(session.sessionId, session);
    options.workerRegistry.updateWorker(worker.workerId, {
      status: "reauth_required",
      reason: "manual operator reauth requested",
      recoverySessionId: session.sessionId
    });
    options.sessionService.handleWorkerStatusChange(worker.workerId);

    response.status(202).json({
      workerId: worker.workerId,
      reauth: session,
      manualLoginRequired: true
    });
  });

  router.get("/internal/workers/:id/reauth", (request, response) => {
    const session = findWorkerRecoverySession(
      options.recoverySessions,
      request.params.id
    );

    if (!session) {
      response.status(404).json({
        error: "reauth_session_not_found",
        workerId: request.params.id
      });
      return;
    }

    response.json({
      workerId: request.params.id,
      reauth: session
    });
  });

  router.post("/internal/workers/:id/reauth/complete", (request, response) => {
    const session = findWorkerRecoverySession(
      options.recoverySessions,
      request.params.id
    );

    if (!session) {
      response.status(404).json({
        error: "reauth_session_not_found",
        workerId: request.params.id
      });
      return;
    }

    const updatedSession: InternalRecoverySession = {
      ...session,
      status: "completed"
    };

    options.recoverySessions.set(updatedSession.sessionId, updatedSession);
    options.workerRegistry.updateWorker(request.params.id, {
      status: "ready",
      reason: "operator finished manual reauth",
      recoverySessionId: null
    });
    options.sessionService.handleWorkerReady();

    response.status(202).json({
      workerId: request.params.id,
      reauth: updatedSession,
      worker: options.workerRegistry.getWorker(request.params.id)
    });
  });

  return router;
}
