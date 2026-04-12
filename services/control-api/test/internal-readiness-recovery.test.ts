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
  const root = mkdtempSync(join(tmpdir(), "control-api-readiness-recovery-"));
  tempDirectories.push(root);

  const readinessRecoveryStatePath = join(
    root,
    "infra",
    "data",
    "readiness-recovery",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(readinessRecoveryStatePath), {
      recursive: true
    });
    writeFileSync(
      readinessRecoveryStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    readinessRecoveryStatePath,
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

describe("internal readiness recovery route", () => {
  it("returns latest null when no readiness recovery state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/readiness-recovery/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest readiness recovery payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-03-31T11:30:00.000Z",
      canaryWorkerId: "shared-6",
      requestedWorkerIds: ["dad", "shared-6"],
      summary: "Recovered one worker and one worker still needs reauth.",
      counts: {
        totalWorkers: 2,
        readyWorkers: 1,
        reauthRequiredWorkers: 1,
        reachableButUnusableWorkers: 0,
        disconnectedWorkers: 0
      },
      recoveredWorkerIds: ["shared-6"],
      blockerSummaries: ["dad:bootstrap_auth_required"],
      inventory: {
        inventoryMismatch: false
      },
      publicCanaryAfterRecovery: {
        chat: {
          ok: true,
          statusCode: 200
        }
      }
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/readiness-recovery/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
