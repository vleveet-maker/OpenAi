import { Router } from "express";

import type {
  InternalBrowserAccessService,
  InternalBrowserAccessSession
} from "./internal-browser-access.js";

export interface InternalRecoveryRouterOptions {
  browserAccessService: InternalBrowserAccessService;
}

export function createInternalRecoveryRouter(
  options: InternalRecoveryRouterOptions
) {
  const router = Router();

  router.post("/internal/workers/:id/reauth/start", (request, response) => {
    try {
      const result = options.browserAccessService.startSession(
        request.params.id,
        "reauth"
      );

      response.status(202).json({
        workerId: result.worker.workerId,
        reauth: result.browserAccess,
        manualLoginRequired: true,
        viewerPath: result.browserAccess.viewerPath
      });
    } catch {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id
      });
    }
  });

  router.get("/internal/workers/:id/reauth", (request, response) => {
    const session = options.browserAccessService.getSession(request.params.id);

    if (!session || session.mode !== "reauth") {
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
    try {
      const result = options.browserAccessService.completeSession(request.params.id);
      const reauthSession = result.browserAccess as InternalBrowserAccessSession;

      response.status(202).json({
        workerId: request.params.id,
        reauth: reauthSession,
        worker: result.worker
      });
    } catch {
      response.status(404).json({
        error: "reauth_session_not_found",
        workerId: request.params.id
      });
    }
  });

  return router;
}
