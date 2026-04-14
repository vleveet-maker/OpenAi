import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase34ServerIsolatedChatTransferRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase34ServerIsolatedChatTransferRouter(
  options: InternalPostPhase34ServerIsolatedChatTransferRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase34-server-isolated-chat-transfer/latest",
    (_request, response) => {
      const statePath = options.statePath;

      if (!statePath || !existsSync(statePath)) {
        response.json({
          latest: null
        });
        return;
      }

      try {
        const latest = readLatestState(statePath);

        response.json({
          latest
        });
      } catch (error: unknown) {
        response.status(500).json({
          error: "post_phase34_server_isolated_chat_transfer_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-34 server isolated chat transfer state could not be read."
        });
      }
    }
  );

  return router;
}
