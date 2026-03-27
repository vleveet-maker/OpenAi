import { Router } from "express";

import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface InternalWorkersRouterOptions {
  workerRegistry: WorkerRegistry;
}

const INTERNAL_WORKERS_PATH = "/internal/workers";

export function createInternalWorkersRouter(
  options: InternalWorkersRouterOptions
) {
  const router = Router();

  router.get(INTERNAL_WORKERS_PATH, (_request, response) => {
    response.json({
      workers: options.workerRegistry.listWorkers()
    });
  });

  router.get(`${INTERNAL_WORKERS_PATH}/:id`, (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
      return;
    }

    response.json(worker);
  });

  router.get(`${INTERNAL_WORKERS_PATH}/:id/status`, (request, response) => {
    const status = options.workerRegistry.getWorkerStatus(request.params.id);

    if (!status) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
      return;
    }

    response.json({
      workerId: request.params.id,
      ...status
    });
  });

  return router;
}
