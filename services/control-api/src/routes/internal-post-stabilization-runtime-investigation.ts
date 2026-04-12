import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostStabilizationRuntimeInvestigationRouterOptions {
  statePath?: string;
}

export function createInternalPostStabilizationRuntimeInvestigationRouter(
  options: InternalPostStabilizationRuntimeInvestigationRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-stabilization-runtime-investigation/latest",
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
          error: "post_stabilization_runtime_investigation_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-stabilization runtime investigation state could not be read."
        });
      }
    }
  );

  return router;
}
