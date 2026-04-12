import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalZeroReadyRootCauseRouterOptions {
  statePath?: string;
}

export function createInternalZeroReadyRootCauseRouter(
  options: InternalZeroReadyRootCauseRouterOptions
) {
  const router = Router();

  router.get("/internal/zero-ready-root-cause/latest", (_request, response) => {
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
        error: "zero_ready_root_cause_state_invalid",
        detail:
          error instanceof Error
            ? error.message
            : "Zero-ready root-cause state could not be read."
      });
    }
  });

  return router;
}
