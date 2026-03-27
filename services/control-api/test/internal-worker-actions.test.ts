import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime() {
  const root = mkdtempSync(join(tmpdir(), "control-api-worker-actions-"));
  tempDirectories.push(root);

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
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
        containerName: "worker-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl: "http://worker-dad:4020",
        defaultStatus: "ready"
      }
    ]
  };

  const dockerEngineClient = {
    restartContainer: vi.fn().mockResolvedValue(undefined),
    inspectContainer: vi.fn()
  };
  const healthMonitor = {
    startHealthMonitor: vi.fn(),
    stopHealthMonitor: vi.fn(),
    runHealthSweep: vi.fn().mockResolvedValue(undefined)
  };
  const runtime = createControlApiRuntime(config, {
    dockerEngineClient,
    healthMonitor
  });
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app,
    dockerEngineClient,
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
