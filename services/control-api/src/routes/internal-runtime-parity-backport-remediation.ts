import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalRuntimeParityBackportRemediationRouterOptions {
  statePath?: string;
}

export function createInternalRuntimeParityBackportRemediationRouter(
  options: InternalRuntimeParityBackportRemediationRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/runtime-parity-backport-remediation/latest",
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
          error: "runtime_parity_backport_remediation_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Runtime parity backport remediation state could not be read."
        });
      }
    }
  );

  return router;
}
