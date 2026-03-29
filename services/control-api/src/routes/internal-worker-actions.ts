import { Router, type Response } from "express";

import type { OperatorEventRecorder } from "../observability/operator-events.js";
import type { SessionService } from "../sessions/session-service.js";
import type { DockerEngineClient } from "../workers/docker-engine-client.js";
import type {
  AlternateDesktopValidationResult,
  HostControllerClient
} from "../workers/host-controller-client.js";
import type { WorkerHealthMonitor } from "../workers/worker-health-monitor.js";
import type { WorkerRegistry } from "../workers/worker-registry.js";

export interface InternalWorkerActionsRouterOptions {
  workerRegistry: WorkerRegistry;
  sessionService: SessionService;
  dockerEngineClient: DockerEngineClient;
  hostControllerClient: HostControllerClient;
  healthMonitor: WorkerHealthMonitor;
  eventRecorder?: OperatorEventRecorder;
}

export function createInternalWorkerActionsRouter(
  options: InternalWorkerActionsRouterOptions
) {
  const router = Router();

  function respondWorkerNotFound(workerId: string, response: Response) {
    response.status(404).json({
      error: "worker_not_found",
      workerId
    });
  }

  function respondActiveSession(workerId: string, response: Response) {
    response.status(409).json({
      error: "worker_has_active_session",
      workerId
    });
  }

  function buildHostTransitionUpdate(
    workerId: string,
    runtimeMode: "visible_auth" | "hidden_runtime" | "alternate_desktop",
    reason: string
  ) {
    const now = new Date().toISOString();

    options.workerRegistry.updateWorker(workerId, {
      status: "starting",
      reason,
      runtimeStatus: "starting",
      assignedSessionId: null,
      assignedUserLabel: null,
      recoverySessionId: null,
      runtimeMode,
      runtimeClass:
        runtimeMode === "visible_auth"
          ? "host_visible_auth"
          : runtimeMode === "alternate_desktop"
            ? "host_alternate_desktop"
            : "host_hidden_runtime",
      headless: runtimeMode === "hidden_runtime",
      cdpAttached:
        runtimeMode === "visible_auth" || runtimeMode === "alternate_desktop",
      browserContextReady: false,
      runtimeCapability: "unreachable",
      lastSeenAt: now
    });
  }

  function deriveValidationCapability(
    validation: AlternateDesktopValidationResult
  ) {
    if (validation.phase11Ready) {
      return "usable" as const;
    }

    return validation.proofFailureClass === "runtime_unreachable"
      ? ("unreachable" as const)
      : ("reachable_but_unusable" as const);
  }

  function deriveValidationUsability(
    validation: AlternateDesktopValidationResult
  ) {
    if (validation.phase11Ready) {
      return "usable" as const;
    }

    if (validation.proofFailureClass === "auth_required") {
      return "auth_required" as const;
    }

    if (validation.bootstrapFailureCode === "bootstrap_challenge_detected") {
      return "challenge_blocked" as const;
    }

    return "surface_unusable" as const;
  }

  router.post("/internal/workers/:id/restart", async (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      respondWorkerNotFound(request.params.id, response);
      return;
    }

    if (worker.runtimeType !== "docker") {
      response.status(409).json({
        error: "worker_restart_unsupported",
        detail: `Worker ${worker.workerId} uses ${worker.runtimeType} runtime and cannot be restarted via Docker.`,
        workerId: worker.workerId
      });
      return;
    }

    try {
      options.eventRecorder?.recordEvent({
        eventType: "worker_restart_requested",
        severity: "info",
        workerId: worker.workerId,
        summary: `Worker ${worker.workerId} restart requested by internal operator`,
        detailJson: JSON.stringify({
          containerName: worker.containerName,
          requestedTimeoutSeconds: 5
        })
      });
      await options.dockerEngineClient.restartContainer(worker.containerName, 5);

      const restartedAt = new Date().toISOString();
      const updatedWorker = options.workerRegistry.updateWorker(worker.workerId, {
        status: "starting",
        reason: "internal restart requested",
        runtimeStatus: "starting",
        assignedSessionId: null,
        assignedUserLabel: null,
        recoverySessionId: null,
        lastSeenAt: restartedAt
      });

      options.sessionService.endActiveSessionForWorker(
        worker.workerId,
        "worker_unavailable"
      );
      void options.healthMonitor.runHealthSweep();

      response.status(202).json({
        action: "restart_requested",
        worker:
          options.workerRegistry.getWorker(worker.workerId) ?? updatedWorker
      });
    } catch (error: unknown) {
      options.eventRecorder?.recordEvent({
        eventType: "worker_restart_failed",
        severity: "error",
        workerId: worker.workerId,
        summary: `Worker ${worker.workerId} restart request failed`,
        detailJson: JSON.stringify({
          containerName: worker.containerName,
          errorMessage:
            error instanceof Error
              ? error.message
              : "The worker container could not be restarted"
        })
      });
      response.status(502).json({
        error: "worker_restart_failed",
        detail:
          error instanceof Error ? error.message : "The worker container could not be restarted"
      });
    }
  });

  router.post("/internal/workers/:id/mark-ready", (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      respondWorkerNotFound(request.params.id, response);
      return;
    }

    if (options.sessionService.hasActiveSessionForWorker(worker.workerId)) {
      respondActiveSession(worker.workerId, response);
      return;
    }

    options.workerRegistry.updateWorker(worker.workerId, {
      status: "ready",
      reason: "internal operator marked worker ready",
      runtimeStatus: "ready",
      recoverySessionId: null,
      runtimeCapability: "reachable_but_unusable"
    });
    options.sessionService.handleWorkerReady();

    response.status(202).json({
      action: "mark_ready",
      worker: options.workerRegistry.getWorker(worker.workerId)
    });
  });

  router.post("/internal/workers/:id/manual-auth/start", async (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      respondWorkerNotFound(request.params.id, response);
      return;
    }

    if (worker.runtimeType !== "host") {
      response.status(409).json({
        error: "manual_auth_unsupported",
        detail: `Worker ${worker.workerId} uses ${worker.runtimeType} runtime and does not support visible manual auth transitions.`,
        workerId: worker.workerId
      });
      return;
    }

    if (options.sessionService.hasActiveSessionForWorker(worker.workerId)) {
      respondActiveSession(worker.workerId, response);
      return;
    }

    try {
      options.eventRecorder?.recordEvent({
        eventType: "worker_reauth_started",
        severity: "info",
        workerId: worker.workerId,
        summary: `Worker ${worker.workerId} entering visible auth for manual login or reauthentication`,
        detailJson: JSON.stringify({
          runtimeMode: "visible_auth",
          previousRuntimeMode: worker.runtimeMode ?? null
        })
      });

      await options.hostControllerClient.stopWorker(worker.workerId);
      const result = await options.hostControllerClient.startWorker(
        worker.workerId,
        "visible_auth"
      );

      buildHostTransitionUpdate(
        worker.workerId,
        "visible_auth",
        "manual visible auth requested by operator"
      );
      void options.healthMonitor.runHealthSweep();

      response.status(202).json({
        action: "manual_auth_start_requested",
        runtimeMode: "visible_auth",
        hostController: result,
        worker: options.workerRegistry.getWorker(worker.workerId)
      });
    } catch (error: unknown) {
      response.status(502).json({
        error: "manual_auth_start_failed",
        detail:
          error instanceof Error
            ? error.message
            : "The host worker could not enter visible auth mode."
      });
    }
  });

  router.post("/internal/workers/:id/manual-auth/complete", async (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      respondWorkerNotFound(request.params.id, response);
      return;
    }

    if (worker.runtimeType !== "host") {
      response.status(409).json({
        error: "manual_auth_unsupported",
        detail: `Worker ${worker.workerId} uses ${worker.runtimeType} runtime and does not support non-visible runtime promotion.`,
        workerId: worker.workerId
      });
      return;
    }

    if (options.sessionService.hasActiveSessionForWorker(worker.workerId)) {
      respondActiveSession(worker.workerId, response);
      return;
    }

    try {
      await options.hostControllerClient.stopWorker(worker.workerId);
      const result = await options.hostControllerClient.startWorker(
        worker.workerId,
        "alternate_desktop"
      );

      buildHostTransitionUpdate(
        worker.workerId,
        "alternate_desktop",
        "manual login completed; alternate desktop validation pending"
      );
      options.eventRecorder?.recordEvent({
        eventType: "worker_reauth_completed",
        severity: "info",
        workerId: worker.workerId,
        summary: `Worker ${worker.workerId} completed manual login and restarted in alternate desktop runtime`,
        detailJson: JSON.stringify({
          runtimeMode: "alternate_desktop",
          previousRuntimeMode: worker.runtimeMode ?? null,
          validationPending: true
        })
      });
      void options.healthMonitor.runHealthSweep();

      response.status(202).json({
        action: "manual_auth_completed_alternate_desktop_started",
        validationPending: true,
        runtimeMode: "alternate_desktop",
        hostController: result,
        worker: options.workerRegistry.getWorker(worker.workerId)
      });
    } catch (error: unknown) {
      response.status(502).json({
        error: "manual_auth_complete_failed",
        detail:
          error instanceof Error
            ? error.message
            : "The host worker could not return to the alternate desktop runtime."
      });
    }
  });

  router.post("/internal/workers/:id/validate-runtime", async (request, response) => {
    const worker = options.workerRegistry.getWorker(request.params.id);

    if (!worker) {
      respondWorkerNotFound(request.params.id, response);
      return;
    }

    if (worker.runtimeType !== "host") {
      response.status(409).json({
        error: "runtime_validation_unsupported",
        detail: `Worker ${worker.workerId} uses ${worker.runtimeType} runtime and does not support alternate desktop validation.`,
        workerId: worker.workerId
      });
      return;
    }

    if (options.sessionService.hasActiveSessionForWorker(worker.workerId)) {
      respondActiveSession(worker.workerId, response);
      return;
    }

    try {
      const validation = await options.hostControllerClient.validateAlternateDesktop(
        worker.workerId
      );

      const requiresAuth = validation.proofFailureClass === "auth_required";
      const validatedWorker = options.workerRegistry.updateWorker(worker.workerId, {
        status: requiresAuth ? "reauth_required" : validation.phase11Ready ? "ready" : worker.status.status,
        reason: requiresAuth
          ? "non-visible runtime validation requires renewed ChatGPT auth"
          : validation.phase11Ready
            ? "non-visible runtime validation passed"
            : "non-visible runtime validation still needs rescue",
        runtimeStatus: requiresAuth ? "reauth_required" : worker.runtimeStatus ?? worker.status.status,
        runtimeMode:
          validation.runtimeMode === "visible_auth" ||
          validation.runtimeMode === "hidden_runtime" ||
          validation.runtimeMode === "alternate_desktop"
            ? validation.runtimeMode
            : worker.runtimeMode ?? "alternate_desktop",
        runtimeClass:
          validation.runtimeClass === "host_visible_auth" ||
          validation.runtimeClass === "host_hidden_runtime" ||
          validation.runtimeClass === "host_alternate_desktop" ||
          validation.runtimeClass === "docker_headed_xvfb"
            ? validation.runtimeClass
            : worker.runtimeClass ?? "host_alternate_desktop",
        runtimeDesktopName: validation.runtimeDesktopName,
        runtimeCapability: deriveValidationCapability(validation),
        lastBootstrapAt: validation.checkedAt,
        lastBootstrapFailureCode: validation.bootstrapFailureCode,
        lastBootstrapStep:
          validation.bootstrapStep === "navigation" ||
          validation.bootstrapStep === "auth_check" ||
          validation.bootstrapStep === "surface_entry" ||
          validation.bootstrapStep === "new_chat" ||
          validation.bootstrapStep === "temporary_entry" ||
          validation.bootstrapStep === "temporary_confirmation" ||
          validation.bootstrapStep === "temporary_onboarding" ||
          validation.bootstrapStep === "model_selection" ||
          validation.bootstrapStep === "composer_ready" ||
          validation.bootstrapStep === "complete"
            ? validation.bootstrapStep
            : null,
        lastBootstrapUsability: deriveValidationUsability(validation),
        lastRelayAt: validation.checkedAt,
        lastRelayFailureCode: validation.relayFailureCode,
        lastSeenAt: validation.checkedAt
      });

      response.status(202).json({
        action: "runtime_validation_requested",
        validation,
        worker: validatedWorker
      });
    } catch (error: unknown) {
      response.status(502).json({
        error: "runtime_validation_failed",
        detail:
          error instanceof Error
            ? error.message
            : "The alternate desktop runtime could not be validated."
      });
    }
  });

  return router;
}
