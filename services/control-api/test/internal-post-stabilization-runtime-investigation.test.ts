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
    join(tmpdir(), "control-api-post-stabilization-runtime-investigation-")
  );
  tempDirectories.push(root);

  const postStabilizationRuntimeInvestigationStatePath = join(
    root,
    "infra",
    "data",
    "post-stabilization-runtime-investigation",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postStabilizationRuntimeInvestigationStatePath), {
      recursive: true
    });
    writeFileSync(
      postStabilizationRuntimeInvestigationStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postStabilizationRuntimeInvestigationStatePath,
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

describe("internal post-stabilization runtime investigation route", () => {
  it("returns latest null when no post-stabilization runtime investigation state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-stabilization-runtime-investigation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest runtime investigation payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-01T09:30:00.000Z",
      scriptCompatibilityVersion:
        "phase17-post-stabilization-runtime-investigation-v1",
      preInvestigationReadyCount: 1,
      postCanaryReadyCount: 0,
      finalReadyCount: 0,
      dominantRuntimeBlocker: "disconnected",
      firstFailingHop: "windows_edge_forced_host",
      verdict: "runtime_blocker_confirmed"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-stabilization-runtime-investigation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase17-post-stabilization-runtime-investigation-v1"
    );
    expect(response.body.latest.preInvestigationReadyCount).toBe(1);
    expect(response.body.latest.postCanaryReadyCount).toBe(0);
    expect(response.body.latest.finalReadyCount).toBe(0);
    expect(response.body.latest.dominantRuntimeBlocker).toBe("disconnected");
    expect(response.body.latest.firstFailingHop).toBe(
      "windows_edge_forced_host"
    );
    expect(response.body.latest.verdict).toBe("runtime_blocker_confirmed");
  });

  it("parses a UTF-8 BOM-prefixed runtime investigation artifact without failing", async () => {
    const root = mkdtempSync(
      join(
        tmpdir(),
        "control-api-post-stabilization-runtime-investigation-bom-"
      )
    );
    tempDirectories.push(root);

    const postStabilizationRuntimeInvestigationStatePath = join(
      root,
      "infra",
      "data",
      "post-stabilization-runtime-investigation",
      "latest.json"
    );
    const latestState = {
      scriptCompatibilityVersion:
        "phase17-post-stabilization-runtime-investigation-v1",
      preInvestigationReadyCount: 1,
      postCanaryReadyCount: 0,
      finalReadyCount: 0,
      dominantRuntimeBlocker: "disconnected",
      firstFailingHop: "windows_edge_forced_host",
      verdict: "runtime_blocker_confirmed"
    };

    mkdirSync(dirname(postStabilizationRuntimeInvestigationStatePath), {
      recursive: true
    });
    writeFileSync(
      postStabilizationRuntimeInvestigationStatePath,
      "\uFEFF" + JSON.stringify(latestState, null, 2),
      "utf8"
    );

    const config: ControlApiConfig = {
      serviceName: "control-api",
      host: "127.0.0.1",
      port: 0,
      internalAdminToken: "secret",
      postStabilizationRuntimeInvestigationStatePath,
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
      .get("/internal/post-stabilization-runtime-investigation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
