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
  latestState:
    | Record<string, unknown>
    | null = null
) {
  const root = mkdtempSync(join(tmpdir(), "control-api-rollout-smoke-"));
  tempDirectories.push(root);

  const rolloutSmokeStatePath = join(
    root,
    "infra",
    "data",
    "rollout-smoke",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(rolloutSmokeStatePath), {
      recursive: true
    });
    writeFileSync(
      rolloutSmokeStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    rolloutSmokeStatePath,
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

describe("internal rollout smoke route", () => {
  it("returns latest null when no rollout smoke state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/rollout-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest rollout smoke payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-03-31T10:15:00.000Z",
      verdict: "ready_for_household_use",
      publicBaseUrl: "http://77.66.186.75",
      canaryWorkerId: "shared-6",
      internal: {
        pool: {
          status: "ready"
        },
        workers: {
          totalWorkers: 7,
          readyWorkers: 7
        }
      },
      publicCanary: {
        healthz: {
          ok: true,
          statusCode: 200
        },
        models: {
          ok: true,
          statusCode: 200
        },
        chat: {
          ok: true,
          statusCode: 200,
          assistantReplyText: "probe-ok"
        }
      }
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/rollout-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
