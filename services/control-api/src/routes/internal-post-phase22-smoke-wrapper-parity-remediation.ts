import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase22SmokeWrapperParityRemediationRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase22SmokeWrapperParityRemediationRouter(
  options: InternalPostPhase22SmokeWrapperParityRemediationRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase22-smoke-wrapper-parity-remediation/latest",
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
          error: "post_phase22_smoke_wrapper_parity_remediation_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-22 smoke-wrapper parity remediation state could not be read."
        });
      }
    }
  );

  return router;
}
