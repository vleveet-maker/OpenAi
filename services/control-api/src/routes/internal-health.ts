import { Router } from "express";

import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface InternalHealthRouterOptions {
  serviceName: string;
  workerRegistry: WorkerRegistry;
}

export function createInternalHealthRouter(
  options: InternalHealthRouterOptions
) {
  const router = Router();

  router.get("/internal/health", (_request, response) => {
    const workers = options.workerRegistry.listWorkers();
    const counts = workers.reduce<Record<string, number>>((accumulator, worker) => {
      const current = accumulator[worker.status.status] ?? 0;
      accumulator[worker.status.status] = current + 1;
      return accumulator;
    }, {});

    response.json({
      service: options.serviceName,
      status: "ok",
      checkedAt: new Date().toISOString(),
      workerCount: workers.length,
      workerStatusCounts: counts
    });
  });

  return router;
}
