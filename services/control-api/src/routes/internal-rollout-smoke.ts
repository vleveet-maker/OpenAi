import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalRolloutSmokeRouterOptions {
  statePath?: string;
}

export function createInternalRolloutSmokeRouter(
  options: InternalRolloutSmokeRouterOptions
) {
  const router = Router();

  router.get("/internal/rollout-smoke/latest", (_request, response) => {
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
        error: "rollout_smoke_state_invalid",
        detail:
          error instanceof Error
            ? error.message
            : "Rollout smoke state could not be read."
      });
    }
  });

  return router;
}
