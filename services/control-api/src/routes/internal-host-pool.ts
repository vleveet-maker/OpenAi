import { Router } from "express";

import {
  HostPoolService,
  HostPoolServiceError
} from "../workers/host-pool-service.js";

export interface InternalHostPoolRouterOptions {
  hostPoolService: HostPoolService;
}

export function createInternalHostPoolRouter(
  options: InternalHostPoolRouterOptions
) {
  const router = Router();

  router.get("/internal/host-pool", async (_request, response) => {
    const snapshot = await options.hostPoolService.refresh();
    response.json({
      pool: {
        ...snapshot,
        workers: snapshot.workers.map((worker) => ({
          ...worker,
          runtimeCapability: worker.runtimeCapability
        }))
      }
    });
  });

  router.post("/internal/host-pool/start", async (_request, response) => {
    try {
      const snapshot = await options.hostPoolService.startPool();
      response.status(202).json({
        action: "start_requested",
        pool: {
          ...snapshot,
          workers: snapshot.workers.map((worker) => ({
            ...worker,
            runtimeCapability: worker.runtimeCapability
          }))
        }
      });
    } catch (error: unknown) {
      if (error instanceof HostPoolServiceError) {
        response.status(error.statusCode).json({
          error: error.code,
          detail: error.detail
        });
        return;
      }

      throw error;
    }
  });

  router.post("/internal/host-pool/stop", async (_request, response) => {
    try {
      const snapshot = await options.hostPoolService.stopPool();
      response.status(202).json({
        action: "stop_requested",
        pool: {
          ...snapshot,
          workers: snapshot.workers.map((worker) => ({
            ...worker,
            runtimeCapability: worker.runtimeCapability
          }))
        }
      });
    } catch (error: unknown) {
      if (error instanceof HostPoolServiceError) {
        response.status(error.statusCode).json({
          error: error.code,
          detail: error.detail
        });
        return;
      }

      throw error;
    }
  });

  return router;
}
