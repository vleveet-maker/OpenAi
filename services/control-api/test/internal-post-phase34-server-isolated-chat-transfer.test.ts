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
    join(tmpdir(), "control-api-post-phase34-server-isolated-chat-transfer-")
  );
  tempDirectories.push(root);

  const postPhase34ServerIsolatedChatTransferStatePath = join(
    root,
    "infra",
    "data",
    "post-phase34-server-isolated-chat-transfer",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postPhase34ServerIsolatedChatTransferStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase34ServerIsolatedChatTransferStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postPhase34ServerIsolatedChatTransferStatePath,
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

describe("internal post-phase34 server isolated chat transfer route", () => {
  it("returns latest null when no post-phase34 server isolated chat transfer state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase34-server-isolated-chat-transfer/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest post-phase34 server isolated chat transfer payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-14T16:20:00.000Z",
      scriptCompatibilityVersion: "phase35-server-isolated-chat-transfer-v1",
      githubBranch: "windows-browser-block-api-20260331",
      windowsRepoPath: "D:\\OpenAi",
      windowsCommit: "abc1234",
      ubuntuRepoPath: "/opt/owmcgp-remote-relay",
      ubuntuCommit: "def5678",
      successfulWorkerId: "wife",
      verdict: "externally_ready"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase34-server-isolated-chat-transfer/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.successfulWorkerId).toBe("wife");
    expect(response.body.latest.verdict).toBe("externally_ready");
  });
});
