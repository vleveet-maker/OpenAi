import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostParityDisconnectedRuntimeRemediationRouterOptions {
  statePath?: string;
}

export function createInternalPostParityDisconnectedRuntimeRemediationRouter(
  options: InternalPostParityDisconnectedRuntimeRemediationRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-parity-disconnected-runtime-remediation/latest",
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
          error: "post_parity_disconnected_runtime_remediation_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-parity disconnected runtime remediation state could not be read."
        });
      }
    }
  );

  return router;
}
