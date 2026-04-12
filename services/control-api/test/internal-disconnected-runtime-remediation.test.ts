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
    join(tmpdir(), "control-api-disconnected-runtime-remediation-")
  );
  tempDirectories.push(root);

  const disconnectedRuntimeRemediationStatePath = join(
    root,
    "infra",
    "data",
    "disconnected-runtime-remediation",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(disconnectedRuntimeRemediationStatePath), {
      recursive: true
    });
    writeFileSync(
      disconnectedRuntimeRemediationStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    disconnectedRuntimeRemediationStatePath,
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

describe("internal disconnected runtime remediation route", () => {
  it("returns latest null when no disconnected runtime remediation state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/disconnected-runtime-remediation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest disconnected runtime remediation payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-01T10:00:00.000Z",
      scriptCompatibilityVersion: "phase18-runtime-remediation-v1",
      preRemediationReadyCount: 0,
      postRemediationReadyCount: 1,
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
      .get("/internal/disconnected-runtime-remediation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase18-runtime-remediation-v1"
    );
    expect(response.body.latest.preRemediationReadyCount).toBe(0);
    expect(response.body.latest.postRemediationReadyCount).toBe(1);
    expect(response.body.latest.dominantRuntimeBlocker).toBe("disconnected");
    expect(response.body.latest.firstFailingHop).toBe(
      "windows_edge_forced_host"
    );
    expect(response.body.latest.forcedHostStatus.passed).toBe(false);
    expect(response.body.latest.publicOwnerStatus.passed).toBe(false);
    expect(response.body.latest.verdict).toBe("hold_rollout");
  });

  it("parses a UTF-8 BOM-prefixed remediation artifact without failing", async () => {
    const root = mkdtempSync(
      join(tmpdir(), "control-api-disconnected-runtime-remediation-bom-")
    );
    tempDirectories.push(root);

    const disconnectedRuntimeRemediationStatePath = join(
      root,
      "infra",
      "data",
      "disconnected-runtime-remediation",
      "latest.json"
    );
    const latestState = {
      scriptCompatibilityVersion: "phase18-runtime-remediation-v1",
      preRemediationReadyCount: 0,
      postRemediationReadyCount: 1,
      dominantRuntimeBlocker: "disconnected",
      firstFailingHop: "windows_edge_forced_host",
      verdict: "hold_rollout"
    };

    mkdirSync(dirname(disconnectedRuntimeRemediationStatePath), {
      recursive: true
    });
    writeFileSync(
      disconnectedRuntimeRemediationStatePath,
      "\uFEFF" + JSON.stringify(latestState, null, 2),
      "utf8"
    );

    const config: ControlApiConfig = {
      serviceName: "control-api",
      host: "127.0.0.1",
      port: 0,
      internalAdminToken: "secret",
      disconnectedRuntimeRemediationStatePath,
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
      .get("/internal/disconnected-runtime-remediation/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
