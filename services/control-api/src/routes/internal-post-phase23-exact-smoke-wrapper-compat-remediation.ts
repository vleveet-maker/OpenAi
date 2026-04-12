import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase23ExactSmokeWrapperCompatRemediationRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase23ExactSmokeWrapperCompatRemediationRouter(
  options: InternalPostPhase23ExactSmokeWrapperCompatRemediationRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest",
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
          error: "post_phase23_exact_smoke_wrapper_compat_remediation_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-23 exact smoke-wrapper compat remediation state could not be read."
        });
      }
    }
  );

  return router;
}
