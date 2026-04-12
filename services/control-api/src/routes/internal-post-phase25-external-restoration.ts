import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase25ExternalRestorationRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase25ExternalRestorationRouter(
  options: InternalPostPhase25ExternalRestorationRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase25-external-restoration/latest",
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
          error: "post_phase25_external_restoration_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-25 external restoration state could not be read."
        });
      }
    }
  );

  return router;
}
