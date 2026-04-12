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
    join(tmpdir(), "control-api-disconnected-baseline-remediation-")
  );
  tempDirectories.push(root);

  const disconnectedBaselineRemediationStatePath = join(
    root,
    "infra",
    "data",
    "disconnected-baseline-remediation",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(disconnectedBaselineRemediationStatePath), {
      recursive: true
    });
    writeFileSync(
      disconnectedBaselineRemediationStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    disconnectedBaselineRemediationStatePath,
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

describe("internal disconnected baseline remediation route", () => {
  it("returns latest null when no disconnected-baseline remediation state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/disconnected-baseline-remediation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest remediation payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-03-31T23:40:00.000Z",
      recoveredReadyCount: 9,
      dominantRemainingBlockerClass: "none",
      forcedHostHopStatus: {
        passed: true,
        chatStatusCode: 200
      },
      publicOwnerHopStatus: {
        passed: false,
        chatStatusCode: 502
      },
      verdict: "hold_rollout"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/disconnected-baseline-remediation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.recoveredReadyCount).toBe(9);
    expect(response.body.latest.dominantRemainingBlockerClass).toBe("none");
    expect(response.body.latest.forcedHostHopStatus).toEqual({
      passed: true,
      chatStatusCode: 200
    });
    expect(response.body.latest.publicOwnerHopStatus).toEqual({
      passed: false,
      chatStatusCode: 502
    });
    expect(response.body.latest.verdict).toBe("hold_rollout");
  });
});
