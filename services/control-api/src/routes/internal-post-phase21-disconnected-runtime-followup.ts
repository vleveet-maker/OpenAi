import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase21DisconnectedRuntimeFollowupRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase21DisconnectedRuntimeFollowupRouter(
  options: InternalPostPhase21DisconnectedRuntimeFollowupRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase21-disconnected-runtime-followup/latest",
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
          error: "post_phase21_disconnected_runtime_followup_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-21 disconnected runtime follow-up state could not be read."
        });
      }
    }
  );

  return router;
}
