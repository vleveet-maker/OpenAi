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
  const root = mkdtempSync(join(tmpdir(), "control-api-admin-page-"));
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
        containerName: "host-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl: "http://host.docker.internal:4021",
        runtimeType: "host",
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

describe("internal admin page", () => {
  it("renders alternate-desktop controls and observability endpoints", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/admin")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.text).toContain("Start pool");
    expect(response.text).toContain("Stop pool");
    expect(response.text).toContain("alternate desktop non-visible runtime");
    expect(response.text).toContain("Start visible login");
    expect(response.text).toContain("Start visible reauth");
    expect(response.text).toContain("Complete login -> non-visible runtime");
    expect(response.text).toContain("Validate non-visible runtime");
    expect(response.text).toContain("Alternate desktop");
    expect(response.text).toContain("Visible auth");
    expect(response.text).toContain("architecture review required");
    expect(response.text).toContain("/internal/host-pool");
    expect(response.text).toContain("degraded");
    expect(response.text).toContain("failed");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/manual-auth/start");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/manual-auth/complete");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/validate-runtime");
    expect(response.text).toContain("/internal/workers/");
    expect(response.text).toContain("/internal/observability/summary");
  });
});
