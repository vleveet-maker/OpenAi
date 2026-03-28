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
      workers: options.workerRegistry.listWorkers().map((worker) => ({
        ...worker,
        lastSeenAt: worker.lastSeenAt ?? null,
        runtimeStatus: worker.runtimeStatus ?? worker.status.status,
        runtimeMode: worker.runtimeMode ?? null,
        runtimeClass: worker.runtimeClass ?? null,
        runtimeDesktopName: worker.runtimeDesktopName ?? null,
        headless: worker.headless ?? null,
        cdpAttached: worker.cdpAttached ?? null,
        proxyServerConfigured: worker.proxyServerConfigured ?? null,
        runtimeCapability: worker.runtimeCapability ?? "unreachable",
        browserContextReady: worker.browserContextReady ?? null,
        lastRelayAt: worker.lastRelayAt ?? null,
        lastRelayFailureCode: worker.lastRelayFailureCode ?? null
      }))
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

    response.json({
      ...worker,
      lastSeenAt: worker.lastSeenAt ?? null,
      runtimeStatus: worker.runtimeStatus ?? worker.status.status,
      runtimeMode: worker.runtimeMode ?? null,
      runtimeClass: worker.runtimeClass ?? null,
      runtimeDesktopName: worker.runtimeDesktopName ?? null,
      headless: worker.headless ?? null,
      cdpAttached: worker.cdpAttached ?? null,
      proxyServerConfigured: worker.proxyServerConfigured ?? null,
      runtimeCapability: worker.runtimeCapability ?? "unreachable",
      browserContextReady: worker.browserContextReady ?? null,
      lastRelayAt: worker.lastRelayAt ?? null,
      lastRelayFailureCode: worker.lastRelayFailureCode ?? null
    });
  });

  router.get(`${INTERNAL_WORKERS_PATH}/:id/status`, (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
      return;
    }

    response.json({
      workerId: request.params.id,
      ...worker.status,
      lastSeenAt: worker.lastSeenAt ?? null,
      runtimeStatus: worker.runtimeStatus ?? worker.status.status,
      runtimeMode: worker.runtimeMode ?? null,
      runtimeClass: worker.runtimeClass ?? null,
      runtimeDesktopName: worker.runtimeDesktopName ?? null,
      headless: worker.headless ?? null,
      cdpAttached: worker.cdpAttached ?? null,
      proxyServerConfigured: worker.proxyServerConfigured ?? null,
      runtimeCapability: worker.runtimeCapability ?? "unreachable",
      browserContextReady: worker.browserContextReady ?? null,
      lastRelayAt: worker.lastRelayAt ?? null,
      lastRelayFailureCode: worker.lastRelayFailureCode ?? null
    });
  });

  return router;
}
