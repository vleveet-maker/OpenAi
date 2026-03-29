import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime() {
  const root = mkdtempSync(join(tmpdir(), "control-api-internal-workers-"));
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

  const runtime = createControlApiRuntime(config, {
    bootstrapTransport: createReadyBootstrapTransport()
  });
  runtime.workerRegistry.updateWorker("dad", {
    status: "ready",
    reason: "test snapshot",
    runtimeStatus: "ready",
    runtimeMode: "alternate_desktop",
    runtimeClass: "host_alternate_desktop",
    runtimeDesktopName: "OWMCGPT-dad",
    headless: false,
    cdpAttached: true,
    browserContextReady: true,
    lastBootstrapAt: "2026-03-29T10:00:00.000Z",
    lastBootstrapFailureCode: "temporary_confirmation_not_found",
    lastBootstrapStep: "temporary_confirmation",
    lastBootstrapUsability: "surface_unusable"
  });

  return {
    runtime,
    app: createControlApiApp(runtime)
  };
}

afterEach(() => {
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

describe("internal workers routes", () => {
  it("exposes host_alternate_desktop runtime details", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const response = await request(app)
      .get("/internal/workers")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body.workers).toHaveLength(1);
    expect(response.body.workers[0].runtimeMode).toBe("alternate_desktop");
    expect(response.body.workers[0].runtimeClass).toBe("host_alternate_desktop");
    expect(response.body.workers[0].runtimeDesktopName).toBe("OWMCGPT-dad");
    expect(response.body.workers[0].lastBootstrapAt).toBe("2026-03-29T10:00:00.000Z");
    expect(response.body.workers[0].lastBootstrapFailureCode).toBe(
      "temporary_confirmation_not_found"
    );
    expect(response.body.workers[0].lastBootstrapStep).toBe("temporary_confirmation");
    expect(response.body.workers[0].lastBootstrapUsability).toBe("surface_unusable");
  });
});
