import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime(
  latestState: Record<string, unknown> | null = null
) {
  const root = mkdtempSync(
    join(tmpdir(), "control-api-post-remediation-degraded-smoke-")
  );
  tempDirectories.push(root);

  const postRemediationDegradedSmokeStatePath = join(
    root,
    "infra",
    "data",
    "post-remediation-degraded-smoke",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postRemediationDegradedSmokeStatePath), {
      recursive: true
    });
    writeFileSync(
      postRemediationDegradedSmokeStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postRemediationDegradedSmokeStatePath,
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
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app
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

describe("internal post-remediation degraded smoke route", () => {
  it("returns latest null when no post-remediation degraded smoke state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-remediation-degraded-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest stabilization payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-01T08:00:00.000Z",
      scriptCompatibilityVersion: "phase16-runtime-parity-sync-v1",
      preSmokeReadyCount: 1,
      finalSmokeReadyCount: 0,
      finalPoolStatus: "degraded",
      publicCanaryPassed: false,
      verdict: "hold_rollout"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-remediation-degraded-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase16-runtime-parity-sync-v1"
    );
    expect(response.body.latest.preSmokeReadyCount).toBe(1);
    expect(response.body.latest.finalSmokeReadyCount).toBe(0);
    expect(response.body.latest.finalPoolStatus).toBe("degraded");
    expect(response.body.latest.publicCanaryPassed).toBe(false);
    expect(response.body.latest.verdict).toBe("hold_rollout");
  });

  it("parses a UTF-8 BOM-prefixed stabilization artifact without failing", async () => {
    const root = mkdtempSync(
      join(tmpdir(), "control-api-post-remediation-degraded-smoke-bom-")
    );
    tempDirectories.push(root);

    const postRemediationDegradedSmokeStatePath = join(
      root,
      "infra",
      "data",
      "post-remediation-degraded-smoke",
      "latest.json"
    );
    const latestState = {
      scriptCompatibilityVersion: "phase16-runtime-parity-sync-v1",
      preSmokeReadyCount: 1,
      finalSmokeReadyCount: 0,
      finalPoolStatus: "degraded",
      publicCanaryPassed: false,
      verdict: "hold_rollout"
    };

    mkdirSync(dirname(postRemediationDegradedSmokeStatePath), {
      recursive: true
    });
    writeFileSync(
      postRemediationDegradedSmokeStatePath,
      "\uFEFF" + JSON.stringify(latestState, null, 2),
      "utf8"
    );

    const config: ControlApiConfig = {
      serviceName: "control-api",
      host: "127.0.0.1",
      port: 0,
      internalAdminToken: "secret",
      postRemediationDegradedSmokeStatePath,
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
    cleanupCallbacks.push(() => runtime.dispose());
    const app = createControlApiApp(runtime);

    const response = await request(app)
      .get("/internal/post-remediation-degraded-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
