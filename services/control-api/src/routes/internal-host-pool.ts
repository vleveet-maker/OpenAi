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

  function parseStartBody(body: unknown): {
    runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop";
    browserWindowMode?: "Normal" | "Minimized" | "CompactCorner";
  } {
    if (typeof body !== "object" || body === null) {
      return {};
    }

    const candidate = body as Record<string, unknown>;
    const runtimeMode =
      candidate.runtimeMode === "visible_auth" ||
      candidate.runtimeMode === "hidden_runtime" ||
      candidate.runtimeMode === "alternate_desktop"
        ? candidate.runtimeMode
        : undefined;
    const browserWindowMode =
      candidate.browserWindowMode === "Normal" ||
      candidate.browserWindowMode === "Minimized" ||
      candidate.browserWindowMode === "CompactCorner"
        ? candidate.browserWindowMode
        : undefined;

    return {
      runtimeMode,
      browserWindowMode
    };
  }

  router.get("/internal/host-pool", async (_request, response) => {
    const snapshot = await options.hostPoolService.refresh();
    response.json({
      pool: {
        ...snapshot,
        routineRuntimeMode: snapshot.routineRuntimeMode,
        routineRuntimeClass: snapshot.routineRuntimeClass,
        routineBrowserWindowMode: snapshot.routineBrowserWindowMode,
        workers: snapshot.workers.map((worker) => ({
          ...worker,
          runtimeCapability: worker.runtimeCapability
        }))
      }
    });
  });

  router.post("/internal/host-pool/start", async (request, response) => {
    try {
      const startOptions = parseStartBody(request.body);
      const snapshot = await options.hostPoolService.startPool(
        startOptions.runtimeMode,
        startOptions.browserWindowMode
      );
      response.status(202).json({
        action: "start_requested",
        pool: {
          ...snapshot,
          routineRuntimeMode: snapshot.routineRuntimeMode,
          routineRuntimeClass: snapshot.routineRuntimeClass,
          routineBrowserWindowMode: snapshot.routineBrowserWindowMode,
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
          routineRuntimeMode: snapshot.routineRuntimeMode,
          routineRuntimeClass: snapshot.routineRuntimeClass,
          routineBrowserWindowMode: snapshot.routineBrowserWindowMode,
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
