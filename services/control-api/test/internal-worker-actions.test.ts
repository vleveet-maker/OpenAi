import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ControlApiConfig, WorkerRuntimeType } from "../src/config.js";
import type {
  AlternateDesktopValidationResult,
  HostControllerClient
} from "../src/workers/host-controller-client.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime(runtimeType: WorkerRuntimeType = "docker") {
  const root = mkdtempSync(join(tmpdir(), "control-api-worker-actions-"));
  tempDirectories.push(root);

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    hostControllerBaseUrl: undefined,
    hostControllerToken: undefined,
    autoStartHostWorkers: false,
    sessionDatabasePath: join(root, "session-routing.sqlite"),
    sessionDurationMinutes: 60,
    sessionSweepIntervalMs: 5_000,
    sessionClientDistPath: join(root, "missing-client-dist"),
    dockerSocketPath: "/var/run/docker.sock",
    workerHealthPollIntervalMs: 5_000,
    workerHealthTimeoutMs: 3_000,
    workerDefinitions: [
      {
        workerId: "dad",
        displayName: "Dad",
        containerName: runtimeType === "host" ? "host-dad" : "worker-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl:
          runtimeType === "host"
            ? "http://host.docker.internal:4021"
            : "http://worker-dad:4020",
        runtimeType,
        defaultStatus: "ready"
      }
    ]
  };

  const dockerEngineClient = {
    restartContainer: vi.fn().mockResolvedValue(undefined),
    inspectContainer: vi.fn()
  };
  const hostControllerClient: HostControllerClient = {
    startWorker: vi.fn().mockResolvedValue({
      action: "start_requested",
      runtimeMode: "alternate_desktop",
      proxyListening: true,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "degraded",
      workers: []
    }),
    stopWorker: vi.fn().mockResolvedValue(undefined),
    startPool: vi.fn().mockResolvedValue({
      action: "pool_start_requested",
      runtimeMode: "alternate_desktop",
      proxyListening: true,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "ready",
      workers: []
    }),
    stopPool: vi.fn().mockResolvedValue({
      action: "pool_stop_requested",
      proxyListening: false,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "idle",
      workers: []
    }),
    getHealth: vi.fn().mockResolvedValue({
      proxyListening: false,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "idle",
      workers: []
    }),
    listWorkers: vi.fn().mockResolvedValue({
      proxyListening: false,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "idle",
      workers: []
    }),
    validateAlternateDesktop: vi.fn().mockResolvedValue({
      workerId: "dad",
      runtimeClass: "host_alternate_desktop",
      runtimeMode: "alternate_desktop",
      result: "alternate_desktop_usable",
      phase11Ready: true,
      validationPending: false,
      proofFailureClass: null,
      pageUrl: "https://chatgpt.com/",
      bootstrapFailureCode: null,
      bootstrapStep: "complete",
      relayFailureCode: null,
      checkedAt: "2026-03-29T03:40:00.000Z",
      runtimeDesktopName: "CodexWorker-dad",
      detail: null
    } satisfies AlternateDesktopValidationResult)
  };
  const healthMonitor = {
    startHealthMonitor: vi.fn(),
    stopHealthMonitor: vi.fn(),
    runHealthSweep: vi.fn().mockResolvedValue(undefined)
  };
  const runtime = createControlApiRuntime(config, {
    dockerEngineClient,
    hostControllerClient,
    healthMonitor,
    bootstrapTransport: createReadyBootstrapTransport()
  });
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app,
    dockerEngineClient,
    hostControllerClient,
    healthMonitor
  };
}

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    const cleanup = cleanupCallbacks.pop();
    cleanup?.();
  }

  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, {
        force: true,
        recursive: true
      });
    }
  }
});

describe("internal worker restart actions", () => {
  it("successful restart request", async () => {
    const { app, runtime, dockerEngineClient, healthMonitor } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Restart Request",
      new Date("2026-03-27T10:00:00.000Z")
    );

    const response = await request(app)
      .post("/internal/workers/dad/restart")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(dockerEngineClient.restartContainer).toHaveBeenCalledWith("worker-dad", 5);
    expect(healthMonitor.runHealthSweep).toHaveBeenCalled();
    expect(response.body.action).toBe("restart_requested");
    expect(response.body.worker.status.status).toBe("starting");
    expect(response.body.worker.runtimeStatus).toBe("starting");
    expect(response.body.worker.assignedSessionId).toBeUndefined();
    expect(
      runtime.sessionService.getSessionSnapshot(session.session.sessionId)?.session.endReason
    ).toBe("worker_unavailable");
  });

  it("returns 404 for a missing worker", async () => {
    const { app, runtime, dockerEngineClient } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const response = await request(app)
      .post("/internal/workers/missing/restart")
      .set("x-internal-admin-token", "secret")
      .expect(404);

    expect(response.body.error).toBe("worker_not_found");
    expect(dockerEngineClient.restartContainer).not.toHaveBeenCalled();
  });

  it("returns 409 when restart is requested for a host-native worker", async () => {
    const { app, runtime, dockerEngineClient, healthMonitor } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const response = await request(app)
      .post("/internal/workers/dad/restart")
      .set("x-internal-admin-token", "secret")
      .expect(409);

    expect(response.body.error).toBe("worker_restart_unsupported");
    expect(dockerEngineClient.restartContainer).not.toHaveBeenCalled();
    expect(healthMonitor.runHealthSweep).not.toHaveBeenCalled();
  });

  it("ends the active session as worker_unavailable when restart is requested", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Restarted Active Session",
      new Date("2026-03-27T10:00:00.000Z")
    );

    await request(app)
      .post("/internal/workers/dad/restart")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    const endedSession = runtime.sessionService.getSessionSnapshot(
      session.session.sessionId
    );

    expect(endedSession?.session.state).toBe("ended");
    expect(endedSession?.session.endReason).toBe("worker_unavailable");
  });
});

describe("internal worker manual auth transitions", () => {
  it("starts host workers in visible_auth for manual login", async () => {
    const { app, runtime, hostControllerClient, healthMonitor } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const response = await request(app)
      .post("/internal/workers/dad/manual-auth/start")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(hostControllerClient.stopWorker).toHaveBeenCalledWith("dad");
    expect(hostControllerClient.startWorker).toHaveBeenCalledWith("dad", "visible_auth");
    expect(healthMonitor.runHealthSweep).toHaveBeenCalled();
    expect(response.body.action).toBe("manual_auth_start_requested");
    expect(response.body.runtimeMode).toBe("visible_auth");
    expect(response.body.worker.runtimeMode).toBe("visible_auth");
    expect(response.body.worker.headless).toBe(false);
    expect(response.body.worker.cdpAttached).toBe(true);
  });

  it("completes manual auth by restarting the host worker in alternate_desktop", async () => {
    const { app, runtime, hostControllerClient, healthMonitor } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    runtime.workerRegistry.updateWorker("dad", {
      status: "reauth_required",
      reason: "manual transition test",
      runtimeStatus: "reauth_required",
      runtimeMode: "visible_auth",
      headless: false,
      cdpAttached: true
    });

    const response = await request(app)
      .post("/internal/workers/dad/manual-auth/complete")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(hostControllerClient.stopWorker).toHaveBeenCalledWith("dad");
    expect(hostControllerClient.startWorker).toHaveBeenCalledWith("dad", "alternate_desktop");
    expect(healthMonitor.runHealthSweep).toHaveBeenCalled();
    expect(response.body.action).toBe("manual_auth_completed_alternate_desktop_started");
    expect(response.body.validationPending).toBe(true);
    expect(response.body.runtimeMode).toBe("alternate_desktop");
    expect(response.body.worker.runtimeMode).toBe("alternate_desktop");
    expect(response.body.worker.runtimeClass).toBe("host_alternate_desktop");
    expect(response.body.worker.headless).toBe(false);
    expect(response.body.worker.cdpAttached).toBe(true);
    expect(response.body.worker.status.reason).toBe(
      "manual login completed; alternate desktop validation pending"
    );
  });

  it("returns 409 for docker workers on manual auth transitions", async () => {
    const { app, runtime, hostControllerClient } = createTestRuntime("docker");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const startResponse = await request(app)
      .post("/internal/workers/dad/manual-auth/start")
      .set("x-internal-admin-token", "secret")
      .expect(409);

    const completeResponse = await request(app)
      .post("/internal/workers/dad/manual-auth/complete")
      .set("x-internal-admin-token", "secret")
      .expect(409);

    expect(startResponse.body.error).toBe("manual_auth_unsupported");
    expect(completeResponse.body.error).toBe("manual_auth_unsupported");
    expect(hostControllerClient.stopWorker).not.toHaveBeenCalled();
    expect(hostControllerClient.startWorker).not.toHaveBeenCalled();
  });
});

describe("internal worker runtime validation", () => {
  it("creates a worker-pinned validation session for a ready host worker", async () => {
    const { app, runtime } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const response = await request(app)
      .post("/internal/workers/dad/validation-session")
      .set("x-internal-admin-token", "secret")
      .send({
        requestedForLabel: "Validation session"
      })
      .expect(201);

    expect(response.body.action).toBe("validation_session_requested");
    expect(response.body.sessionId).toBe(response.body.session.session.sessionId);
    expect(response.body.session.session.workerId).toBe("dad");
    expect(response.body.session.session.state).toBe("active");
    expect(response.body.session.session.requestedForLabel).toBe("Validation session");
    expect(runtime.workerRegistry.getWorker("dad")?.status.status).toBe("busy");
  });

  it("rejects worker-pinned validation sessions when the worker is not ready", async () => {
    const { app, runtime } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    runtime.workerRegistry.updateWorker("dad", {
      status: "starting",
      reason: "booting"
    });

    const response = await request(app)
      .post("/internal/workers/dad/validation-session")
      .set("x-internal-admin-token", "secret")
      .expect(409);

    expect(response.body.error).toBe("worker_not_ready");
    expect(response.body.workerId).toBe("dad");
  });

  it("validates host workers through the host controller and records a usable runtime", async () => {
    const { app, runtime, hostControllerClient } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    runtime.workerRegistry.updateWorker("dad", {
      status: "ready",
      reason: "validation test",
      runtimeStatus: "ready",
      runtimeMode: "alternate_desktop",
      runtimeClass: "host_alternate_desktop"
    });

    const response = await request(app)
      .post("/internal/workers/dad/validate-runtime")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(hostControllerClient.validateAlternateDesktop).toHaveBeenCalledWith("dad");
    expect(response.body.action).toBe("runtime_validation_requested");
    expect(response.body.validation.phase11Ready).toBe(true);
    expect(response.body.worker.runtimeCapability).toBe("usable");
    expect(response.body.worker.stabilityGateStatus).toBe("provisional");
    expect(response.body.worker.stabilityPassCount).toBe(1);
    expect(response.body.worker.stabilityTargetPasses).toBe(2);
    expect(response.body.worker.lastBootstrapStep).toBe("complete");
    expect(response.body.worker.lastBootstrapUsability).toBe("usable");
  });

  it("marks host workers stable after two consecutive successful validations", async () => {
    const { app, runtime } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    runtime.workerRegistry.updateWorker("dad", {
      status: "ready",
      reason: "repeatability test",
      runtimeStatus: "ready",
      runtimeMode: "alternate_desktop",
      runtimeClass: "host_alternate_desktop"
    });

    await request(app)
      .post("/internal/workers/dad/validate-runtime")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    const response = await request(app)
      .post("/internal/workers/dad/validate-runtime")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(response.body.worker.stabilityGateStatus).toBe("stable");
    expect(response.body.worker.stabilityPassCount).toBe(2);
    expect(response.body.worker.stabilityTargetPasses).toBe(2);
  });

  it("marks host workers as reauth_required when runtime validation reports auth loss", async () => {
    const { app, runtime, hostControllerClient } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    vi.mocked(hostControllerClient.validateAlternateDesktop).mockResolvedValueOnce({
      workerId: "dad",
      runtimeClass: "host_alternate_desktop",
      runtimeMode: "alternate_desktop",
      result: "alternate_desktop_reachable_but_unusable",
      phase11Ready: false,
      validationPending: true,
      proofFailureClass: "auth_required",
      pageUrl: "https://chatgpt.com/auth/login",
      bootstrapFailureCode: "bootstrap_auth_required",
      bootstrapStep: "auth_check",
      relayFailureCode: null,
      checkedAt: "2026-03-29T03:42:00.000Z",
      runtimeDesktopName: "CodexWorker-dad",
      detail: "auth lost"
    });

    const response = await request(app)
      .post("/internal/workers/dad/validate-runtime")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(response.body.worker.status.status).toBe("reauth_required");
    expect(response.body.worker.lastBootstrapFailureCode).toBe("bootstrap_auth_required");
    expect(response.body.worker.lastBootstrapUsability).toBe("auth_required");
    expect(response.body.worker.runtimeCapability).toBe("reachable_but_unusable");
    expect(response.body.worker.stabilityGateStatus).toBe("unstable");
    expect(response.body.worker.stabilityPassCount).toBe(0);
    expect(response.body.worker.lastValidationResult).toBe(
      "alternate_desktop_reachable_but_unusable"
    );
  });

  it("resets repeatability when validation fails after a provisional pass", async () => {
    const { app, runtime, hostControllerClient } = createTestRuntime("host");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    runtime.workerRegistry.updateWorker("dad", {
      status: "ready",
      reason: "repeatability reset test",
      runtimeStatus: "ready",
      runtimeMode: "alternate_desktop",
      runtimeClass: "host_alternate_desktop",
      stabilityGateStatus: "provisional",
      stabilityPassCount: 1,
      stabilityTargetPasses: 2
    });
    vi.mocked(hostControllerClient.validateAlternateDesktop).mockResolvedValueOnce({
      workerId: "dad",
      runtimeClass: "host_alternate_desktop",
      runtimeMode: "alternate_desktop",
      result: "alternate_desktop_reachable_but_unusable",
      phase11Ready: false,
      validationPending: true,
      proofFailureClass: "bootstrap_failed",
      pageUrl: "https://chatgpt.com/",
      bootstrapFailureCode: "bootstrap_navigation_failed",
      bootstrapStep: "navigation",
      relayFailureCode: null,
      checkedAt: "2026-03-29T03:43:00.000Z",
      runtimeDesktopName: "CodexWorker-dad",
      detail: "navigation drift"
    });

    const response = await request(app)
      .post("/internal/workers/dad/validate-runtime")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(response.body.worker.stabilityGateStatus).toBe("unstable");
    expect(response.body.worker.stabilityPassCount).toBe(0);
    expect(response.body.worker.lastValidationResult).toBe(
      "alternate_desktop_reachable_but_unusable"
    );
  });

  it("returns 409 for docker workers on runtime validation", async () => {
    const { app, runtime, hostControllerClient } = createTestRuntime("docker");
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const response = await request(app)
      .post("/internal/workers/dad/validate-runtime")
      .set("x-internal-admin-token", "secret")
      .expect(409);

    expect(response.body.error).toBe("runtime_validation_unsupported");
    expect(hostControllerClient.validateAlternateDesktop).not.toHaveBeenCalled();
  });
});
