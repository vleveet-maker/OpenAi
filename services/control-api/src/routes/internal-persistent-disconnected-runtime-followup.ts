import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPersistentDisconnectedRuntimeFollowupRouterOptions {
  statePath?: string;
}

export function createInternalPersistentDisconnectedRuntimeFollowupRouter(
  options: InternalPersistentDisconnectedRuntimeFollowupRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/persistent-disconnected-runtime-followup/latest",
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
          error: "persistent_disconnected_runtime_followup_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Persistent disconnected runtime follow-up state could not be read."
        });
      }
    }
  );

  return router;
}
