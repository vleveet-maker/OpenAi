import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostRemediationDegradedSmokeRouterOptions {
  statePath?: string;
}

export function createInternalPostRemediationDegradedSmokeRouter(
  options: InternalPostRemediationDegradedSmokeRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-remediation-degraded-smoke/latest",
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
          error: "post_remediation_degraded_smoke_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-remediation degraded smoke state could not be read."
        });
      }
    }
  );

  return router;
}
