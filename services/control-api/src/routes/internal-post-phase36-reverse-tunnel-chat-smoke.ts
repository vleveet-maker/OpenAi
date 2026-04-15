import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase36ReverseTunnelChatSmokeRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase36ReverseTunnelChatSmokeRouter(
  options: InternalPostPhase36ReverseTunnelChatSmokeRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase36-reverse-tunnel-chat-smoke/latest",
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
          error: "post_phase36_reverse_tunnel_chat_smoke_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-36 reverse tunnel chat smoke state could not be read."
        });
      }
    }
  );

  return router;
}
