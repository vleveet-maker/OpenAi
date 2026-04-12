import { existsSync } from "node:fs";

import { Router } from "express";

import { readLatestState } from "./read-latest-state.js";

export interface InternalPostPhase26UbuntuSshRecoveryRouterOptions {
  statePath?: string;
}

export function createInternalPostPhase26UbuntuSshRecoveryRouter(
  options: InternalPostPhase26UbuntuSshRecoveryRouterOptions
) {
  const router = Router();

  router.get(
    "/internal/post-phase26-ubuntu-ssh-recovery/latest",
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
          error: "post_phase26_ubuntu_ssh_recovery_state_invalid",
          detail:
            error instanceof Error
              ? error.message
              : "Post-Phase-26 Ubuntu SSH recovery state could not be read."
        });
      }
    }
  );

  return router;
}
