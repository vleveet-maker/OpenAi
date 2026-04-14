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

function createTestRuntime(latestState: Record<string, unknown> | null = null) {
  const root = mkdtempSync(
    join(tmpdir(), "control-api-post-phase35-server-token-ssh-listener-")
  );
  tempDirectories.push(root);

  const postPhase35ServerTokenSshListenerRecoveryStatePath = join(
    root,
    "infra",
    "data",
    "post-phase35-server-token-ssh-listener-recovery",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postPhase35ServerTokenSshListenerRecoveryStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase35ServerTokenSshListenerRecoveryStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postPhase35ServerTokenSshListenerRecoveryStatePath,
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
        workerId: "wife",
        displayName: "Wife",
        containerName: "host-wife",
        profilePath: "/profiles/wife",
        agentBaseUrl: "http://host.docker.internal:4022",
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

describe("internal post-phase35 server token SSH listener recovery route", () => {
  it("returns latest null when no post-phase35 state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase35-server-token-ssh-listener-recovery/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest post-phase35 token SSH listener recovery payload", async () => {
    const latestState = {
      generatedAt: "2026-04-14T20:20:00.000Z",
      scriptCompatibilityVersion: "phase36-server-token-ssh-listener-recovery-v1",
      tokenResolution: {
        status: "resolved",
        source: "ssh:77.66.186.75:remote_env_file:OWMCGP_REMOTE_RELAY_API_TOKEN",
        secretValueRecorded: false
      },
      selectedUbuntuHost: "77.66.186.75",
      ubuntuListenerTruth: {
        allRequiredPresent: true,
        presentPorts: [14021, 14040],
        missingPorts: []
      },
      verdict: "externally_ready"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase35-server-token-ssh-listener-recovery/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.tokenResolution.secretValueRecorded).toBe(false);
    expect(response.body.latest.verdict).toBe("externally_ready");
  });
});
