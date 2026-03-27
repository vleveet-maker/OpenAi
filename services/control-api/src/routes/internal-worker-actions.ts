import { Router } from "express";

import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface InternalWorkerActionsRouterOptions {
  workerRegistry: WorkerRegistry;
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
      assignedUserId: null,
      recoverySessionId: null
    });

    response.status(202).json({
      action: "restart_requested",
      worker: updatedWorker
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

    const updatedWorker = options.workerRegistry.updateWorker(worker.workerId, {
      status: "ready",
      reason: "internal operator marked worker ready"
    });

    response.status(202).json({
      action: "mark_ready",
      worker: updatedWorker
    });
  });

  return router;
}
