import { Router } from "express";

import type { SessionService } from "../sessions/session-service.js";

export interface PublicSessionsRouterOptions {
  sessionService: SessionService;
}

interface CreateSessionBody {
  requestedForLabel?: unknown;
}

function parseRequestedForLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 64) {
    return null;
  }

  return trimmed;
}

export function createPublicSessionsRouter(
  options: PublicSessionsRouterOptions
) {
  const router = Router();

  router.post("/api/sessions", (request, response) => {
    const body = request.body as CreateSessionBody;
    const requestedForLabel = parseRequestedForLabel(body.requestedForLabel);

    if (!requestedForLabel) {
      response.status(400).json({
        error: "invalid_requested_for_label",
        detail: "requestedForLabel must be a trimmed string between 1 and 64 characters"
      });
      return;
    }

    const session = options.sessionService.createSession(requestedForLabel);
    response.status(201).json(session);
  });

  router.get("/api/sessions/:sessionId", (request, response) => {
    const session = options.sessionService.getSessionSnapshot(
      request.params.sessionId
    );

    if (!session) {
      response.status(404).json({
        error: "session_not_found",
        sessionId: request.params.sessionId
      });
      return;
    }

    response.json(session);
  });

  router.post("/api/sessions/:sessionId/cancel", (request, response) => {
    const snapshot = options.sessionService.getSessionSnapshot(
      request.params.sessionId
    );

    if (!snapshot) {
      response.status(404).json({
        error: "session_not_found",
        sessionId: request.params.sessionId
      });
      return;
    }

    if (snapshot.session.state !== "queued") {
      response.status(409).json({
        error: "invalid_session_state",
        state: snapshot.session.state
      });
      return;
    }

    response.json(
      options.sessionService.cancelQueuedSession(request.params.sessionId)!
    );
  });

  router.post("/api/sessions/:sessionId/end", (request, response) => {
    const snapshot = options.sessionService.getSessionSnapshot(
      request.params.sessionId
    );

    if (!snapshot) {
      response.status(404).json({
        error: "session_not_found",
        sessionId: request.params.sessionId
      });
      return;
    }

    if (snapshot.session.state !== "active") {
      response.status(409).json({
        error: "invalid_session_state",
        state: snapshot.session.state
      });
      return;
    }

    response.json(
      options.sessionService.endActiveSession(
        request.params.sessionId,
        "manual_end"
      )!
    );
  });

  router.get("/api/session-bootstrap/:sessionId", (request, response) => {
    const session = options.sessionService.getSessionSnapshot(
      request.params.sessionId
    );

    if (!session) {
      response.status(404).json({
        error: "session_not_found",
        sessionId: request.params.sessionId
      });
      return;
    }

    response.json(session);
  });

  return router;
}
