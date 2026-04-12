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
  const root = mkdtempSync(join(tmpdir(), "control-api-post-recovery-regression-"));
  tempDirectories.push(root);

  const postRecoveryRegressionStatePath = join(
    root,
    "infra",
    "data",
    "post-recovery-regression",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postRecoveryRegressionStatePath), {
      recursive: true
    });
    writeFileSync(
      postRecoveryRegressionStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postRecoveryRegressionStatePath,
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

describe("internal post-recovery regression route", () => {
  it("returns latest null when no post-recovery regression state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-recovery-regression/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest post-recovery regression payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-03-31T14:40:00.000Z",
      scriptCompatibilityVersion: "phase13-post-recovery-smoke-regression-v1",
      verdict: "hold_rollout",
      firstRegressionStage: "after_smoke",
      stageSnapshots: {
        before_recovery: {
          internal: {
            workers: {
              readyWorkers: 0,
              totalWorkers: 9
            }
          }
        },
        after_recovery: {
          internal: {
            workers: {
              readyWorkers: 9,
              totalWorkers: 9
            }
          }
        }
      },
      smoke: {
        verdict: "hold_rollout"
      }
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-recovery-regression/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase13-post-recovery-smoke-regression-v1"
    );
    expect(response.body.latest.stageSnapshots).toBeTruthy();
    expect(response.body.latest.firstRegressionStage).toBe("after_smoke");
    expect(response.body.latest.verdict).toBe("hold_rollout");
  });
});
