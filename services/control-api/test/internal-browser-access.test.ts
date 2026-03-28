import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime() {
  const root = mkdtempSync(join(tmpdir(), "control-api-browser-access-"));
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
    healthMonitor,
    bootstrapTransport: createReadyBootstrapTransport()
  });
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();

  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
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

describe("internal browser access routes", () => {
  it("starts browser access and returns the exact viewerPath", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/internal/workers/dad/browser-access/start")
      .set("x-internal-admin-token", "secret")
      .send({
        mode: "first_login"
      })
      .expect(202);

    expect(response.body.workerId).toBe("dad");
    expect(response.body.manualLoginRequired).toBe(true);
    expect(response.body.browserAccess.mode).toBe("first_login");
    expect(response.body.viewerPath).toContain("/internal/browser/dad/vnc_lite.html");
    expect(response.body.viewerPath).toContain(
      "path=internal%2Fbrowser%2Fdad%2Fwebsockify%3FsessionId%3D"
    );
    expect(response.body.viewerPath).toContain("autoconnect=true");
    expect(response.body.viewerPath).toContain(`sessionId=${response.body.browserAccess.sessionId}`);
    expect(response.body.viewerPath).toContain(
      `accessToken=${response.body.browserAccess.accessToken}`
    );
  });

  it("returns 204 for an active browser access session and 403 otherwise", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const startResponse = await request(app)
      .post("/internal/workers/dad/browser-access/start")
      .set("x-internal-admin-token", "secret")
      .send({
        mode: "first_login"
      })
      .expect(202);

    await request(app)
      .get("/internal/browser-access/authorize")
      .set("x-internal-admin-token", "secret")
      .query({
        workerId: "dad",
        sessionId: startResponse.body.browserAccess.sessionId,
        accessToken: startResponse.body.browserAccess.accessToken
      })
      .expect(204);

    await request(app)
      .get("/internal/browser-access/authorize")
      .set("x-internal-admin-token", "secret")
      .query({
        workerId: "dad",
        sessionId: startResponse.body.browserAccess.sessionId,
        accessToken: "wrong-token"
      })
      .expect(403);
  });

  it("cancels and completes browser access lifecycle", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    await request(app)
      .post("/internal/workers/dad/browser-access/start")
      .set("x-internal-admin-token", "secret")
      .send({
        mode: "first_login"
      })
      .expect(202);

    const cancelResponse = await request(app)
      .post("/internal/workers/dad/browser-access/cancel")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(cancelResponse.body.browserAccess.status).toBe("cancelled");

    await request(app)
      .post("/internal/workers/dad/browser-access/start")
      .set("x-internal-admin-token", "secret")
      .send({
        mode: "first_login"
      })
      .expect(202);

    const completeResponse = await request(app)
      .post("/internal/workers/dad/browser-access/complete")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(completeResponse.body.browserAccess.status).toBe("completed");
    expect(completeResponse.body.worker.status.status).toBe("ready");
  });

  it("expires browser access sessions after the 15-minute ttl", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T08:00:00.000Z"));
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const startResponse = await request(app)
      .post("/internal/workers/dad/browser-access/start")
      .set("x-internal-admin-token", "secret")
      .send({
        mode: "first_login"
      })
      .expect(202);

    vi.setSystemTime(new Date("2026-03-28T08:16:00.000Z"));

    await request(app)
      .get("/internal/browser-access/authorize")
      .set("x-internal-admin-token", "secret")
      .query({
        workerId: "dad",
        sessionId: startResponse.body.browserAccess.sessionId,
        accessToken: startResponse.body.browserAccess.accessToken
      })
      .expect(403);

    const sessionResponse = await request(app)
      .get("/internal/workers/dad/browser-access")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(sessionResponse.body.browserAccess.status).toBe("expired");
  });

  it("delegates reauth start to browser access", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/internal/workers/dad/reauth/start")
      .set("x-internal-admin-token", "secret")
      .expect(202);

    expect(response.body.workerId).toBe("dad");
    expect(response.body.manualLoginRequired).toBe(true);
    expect(response.body.reauth.mode).toBe("reauth");
    expect(response.body.viewerPath).toContain("/internal/browser/dad/vnc_lite.html");
    expect(runtime.workerRegistry.getWorker("dad")?.status.status).toBe("reauth_required");
  });
});
