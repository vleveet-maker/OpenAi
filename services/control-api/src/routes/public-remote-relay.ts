import { type NextFunction, type Request, type Response, Router } from "express";

import {
  RemoteRelayService,
  RemoteRelayServiceError,
  type RemoteRelayAskRequest
} from "../remote/remote-relay-service.js";

export interface PublicRemoteRelayRouterOptions {
  remoteRelayService: RemoteRelayService;
  apiToken: string;
}

function requireRemoteRelayToken(apiToken: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const header = request.header("authorization");

    if (!header || !header.startsWith("Bearer ")) {
      response.status(401).json({
        error: "remote_relay_unauthorized"
      });
      return;
    }

    const providedToken = header.slice("Bearer ".length).trim();

    if (providedToken !== apiToken) {
      response.status(403).json({
        error: "remote_relay_forbidden"
      });
      return;
    }

    next();
  };
}

function handleRemoteRelayError(
  error: unknown,
  response: Response
): boolean {
  if (!(error instanceof RemoteRelayServiceError)) {
    return false;
  }

  response.status(error.statusCode).json({
    error: error.code,
    detail: error.detail
  });
  return true;
}

export function createPublicRemoteRelayRouter(
  options: PublicRemoteRelayRouterOptions
) {
  const router = Router();
  const requireToken = requireRemoteRelayToken(options.apiToken);

  router.use("/api/relay", requireToken);

  router.get("/api/relay/health", (_request, response) => {
    response.json(options.remoteRelayService.getHealth());
  });

  router.post("/api/relay/ask", async (request, response) => {
    try {
      const result = await options.remoteRelayService.ask(
        request.body as RemoteRelayAskRequest
      );
      response.json(result);
    } catch (error: unknown) {
      if (!handleRemoteRelayError(error, response)) {
        throw error;
      }
    }
  });

  router.post("/api/relay/dialogs/:dialogId/end", (request, response) => {
    try {
      const result = options.remoteRelayService.endDialog(request.params.dialogId);
      response.json(result);
    } catch (error: unknown) {
      if (!handleRemoteRelayError(error, response)) {
        throw error;
      }
    }
  });

  return router;
}
