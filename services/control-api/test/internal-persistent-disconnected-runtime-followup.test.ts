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
    join(tmpdir(), "control-api-persistent-disconnected-followup-")
  );
  tempDirectories.push(root);

  const persistentDisconnectedRuntimeFollowupStatePath = join(
    root,
    "infra",
    "data",
    "persistent-disconnected-runtime-followup",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(persistentDisconnectedRuntimeFollowupStatePath), {
      recursive: true
    });
    writeFileSync(
      persistentDisconnectedRuntimeFollowupStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    persistentDisconnectedRuntimeFollowupStatePath,
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

describe("internal persistent disconnected runtime follow-up route", () => {
  it("returns latest null when no persistent follow-up state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/persistent-disconnected-runtime-followup/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest persistent follow-up payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-01T11:00:00.000Z",
      scriptCompatibilityVersion: "phase19-persistent-followup-v1",
      preFollowupReadyCount: 0,
      postFollowupReadyCount: 1,
      dominantRuntimeBlocker: "disconnected",
      firstFailingHop: "windows_edge_forced_host",
      forcedHostStatus: {
        passed: false,
        chatStatusCode: 502
      },
      publicOwnerStatus: {
        passed: false,
        chatStatusCode: 502
      },
      verdict: "hold_rollout"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/persistent-disconnected-runtime-followup/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase19-persistent-followup-v1"
    );
    expect(response.body.latest.preFollowupReadyCount).toBe(0);
    expect(response.body.latest.postFollowupReadyCount).toBe(1);
    expect(response.body.latest.dominantRuntimeBlocker).toBe("disconnected");
    expect(response.body.latest.firstFailingHop).toBe(
      "windows_edge_forced_host"
    );
    expect(response.body.latest.forcedHostStatus.passed).toBe(false);
    expect(response.body.latest.publicOwnerStatus.passed).toBe(false);
    expect(response.body.latest.verdict).toBe("hold_rollout");
  });

  it("parses a UTF-8 BOM-prefixed persistent follow-up artifact without failing", async () => {
    const root = mkdtempSync(
      join(tmpdir(), "control-api-persistent-disconnected-followup-bom-")
    );
    tempDirectories.push(root);

    const persistentDisconnectedRuntimeFollowupStatePath = join(
      root,
      "infra",
      "data",
      "persistent-disconnected-runtime-followup",
      "latest.json"
    );
    const latestState = {
      scriptCompatibilityVersion: "phase19-persistent-followup-v1",
      preFollowupReadyCount: 0,
      postFollowupReadyCount: 1,
      dominantRuntimeBlocker: "disconnected",
      firstFailingHop: "windows_edge_forced_host",
      verdict: "hold_rollout"
    };

    mkdirSync(dirname(persistentDisconnectedRuntimeFollowupStatePath), {
      recursive: true
    });
    writeFileSync(
      persistentDisconnectedRuntimeFollowupStatePath,
      "\uFEFF" + JSON.stringify(latestState, null, 2),
      "utf8"
    );

    const config: ControlApiConfig = {
      serviceName: "control-api",
      host: "127.0.0.1",
      port: 0,
      internalAdminToken: "secret",
      persistentDisconnectedRuntimeFollowupStatePath,
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
      .get("/internal/persistent-disconnected-runtime-followup/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
