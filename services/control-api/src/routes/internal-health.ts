import { Router } from "express";

import { summarizeWorkerStatusCounts } from "../observability/operator-events.js";
import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface HealthRouterOptions {
  serviceName: string;
  workerRegistry: WorkerRegistry;
}

export function createHealthRouter(options: HealthRouterOptions) {
  const router = Router();

  router.get("/healthz", (_request, response) => {
    response.json({
      service: options.serviceName,
      status: "ok",
      checkedAt: new Date().toISOString()
    });
  });

  router.get("/readyz", (_request, response) => {
    const workerSummary = summarizeWorkerStatusCounts(options.workerRegistry);

    response.json({
      service: options.serviceName,
      status: workerSummary.degraded ? "degraded" : "ready",
      checkedAt: new Date().toISOString(),
      totalWorkers: workerSummary.totalWorkers,
      workerStatusCounts: workerSummary.workerStatusCounts
    });
  });

  return router;
}
