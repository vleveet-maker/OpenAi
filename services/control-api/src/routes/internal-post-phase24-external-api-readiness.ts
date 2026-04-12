import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase24ExternalApiReadinessRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase24ExternalApiReadinessRouter(
  options: InternalPostPhase24ExternalApiReadinessRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase24-external-api-readiness/latest",
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
          error: "post_phase24_external_api_readiness_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-24 external API readiness state could not be read."
        });
      }
    }
  );

  return router;
}
