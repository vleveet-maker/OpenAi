import { Router } from "express";

import type { SessionService } from "../sessions/session-service.js";
import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface InternalWorkerActionsRouterOptions {
  workerRegistry: WorkerRegistry;
  sessionService: SessionService;
}

export function createInternalWorkerActionsRouter(
  options: InternalWorkerActionsRouterOptions
) {
  const router = Router();

  router.post("/internal/workers/:id/restart", (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
      return;
    }

    const updatedWorker = options.workerRegistry.updateWorker(worker.workerId, {
      status: "starting",
      reason: "internal restart requested",
      assignedSessionId: null,
      assignedUserLabel: null,
      recoverySessionId: null
    });
    options.sessionService.endActiveSessionForWorker(
      worker.workerId,
      "worker_unavailable"
    );

    response.status(202).json({
      action: "restart_requested",
      worker:
        options.workerRegistry.getWorker(worker.workerId) ?? updatedWorker
    });
  });

  router.post("/internal/workers/:id/mark-ready", (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
      return;
    }

    if (options.sessionService.hasActiveSessionForWorker(worker.workerId)) {
      response.status(409).json({
        error: "worker_has_active_session",
        workerId: worker.workerId
      });
      return;
    }

    options.workerRegistry.updateWorker(worker.workerId, {
      status: "ready",
      reason: "internal operator marked worker ready",
      recoverySessionId: null
    });
    options.sessionService.handleWorkerReady();

    response.status(202).json({
      action: "mark_ready",
      worker: options.workerRegistry.getWorker(worker.workerId)
    });
  });

  return router;
}
