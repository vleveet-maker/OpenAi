import { Router } from "express";

import {
  ChatRelayService,
  ChatRelayServiceError
} from "../chat/chat-relay-service.js";

export interface PublicChatRouterOptions {
  chatRelayService: ChatRelayService;
}

interface SendMessageBody {
  bodyText?: unknown;
}

export function createPublicChatRouter(
  options: PublicChatRouterOptions
) {
  const router = Router();

  router.get("/api/sessions/:sessionId/messages", (request, response) => {
    const snapshot = options.chatRelayService.getConversationSnapshot(
      request.params.sessionId
    );

    if (!snapshot) {
      response.status(404).json({
        error: "session_not_found",
        sessionId: request.params.sessionId
      });
      return;
    }

    response.json(snapshot);
  });

  router.post("/api/sessions/:sessionId/messages", (request, response) => {
    try {
      const body = request.body as SendMessageBody;
      const snapshot = options.chatRelayService.sendMessage(
        request.params.sessionId,
        body.bodyText
      );

      response.status(202).json(snapshot);
    } catch (error: unknown) {
      if (error instanceof ChatRelayServiceError) {
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
