import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalReadinessRecoveryRouterOptions {
  statePath?: string;
}

export function createInternalReadinessRecoveryRouter(
  options: InternalReadinessRecoveryRouterOptions
) {
  const router = Router();

  router.get("/internal/readiness-recovery/latest", (_request, response) => {
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
        error: "readiness_recovery_state_invalid",
        detail:
          error instanceof Error
            ? error.message
            : "Readiness recovery state could not be read."
      });
    }
  });

  return router;
}
