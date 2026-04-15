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
    join(tmpdir(), "control-api-post-phase36-reverse-tunnel-")
  );
  tempDirectories.push(root);

  const postPhase36ReverseTunnelChatSmokeStatePath = join(
    root,
    "infra",
    "data",
    "post-phase36-reverse-tunnel-chat-smoke",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postPhase36ReverseTunnelChatSmokeStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase36ReverseTunnelChatSmokeStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postPhase36ReverseTunnelChatSmokeStatePath,
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

describe("internal post-phase36 reverse tunnel chat smoke route", () => {
  it("returns latest null when no post-phase36 state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase36-reverse-tunnel-chat-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest post-phase36 reverse tunnel chat smoke payload", async () => {
    const latestState = {
      generatedAt: "2026-04-15T00:30:00.000Z",
      scriptCompatibilityVersion: "phase37-reverse-tunnel-chat-smoke-v1",
      tokenResolution: {
        status: "resolved",
        source: "ssh:77.66.186.75:remote_env_file:REMOTE_RELAY_API_TOKEN",
        secretValueRecorded: false
      },
      tunnelStart: {
        owner: "temporary_process",
        directStartAttempted: true
      },
      selectedUbuntuHost: "77.66.186.75",
      ubuntuListenerTruth: {
        allRequiredPresent: true,
        presentPorts: [14021, 14022, 14040],
        missingPorts: []
      },
      externalSmoke: {
        ok: true,
        chatCompletions: {
          success: true,
          statusCode: 200
        }
      },
      verdict: "externally_ready"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase36-reverse-tunnel-chat-smoke/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.tokenResolution.secretValueRecorded).toBe(false);
    expect(response.body.latest.verdict).toBe("externally_ready");
  });
});
