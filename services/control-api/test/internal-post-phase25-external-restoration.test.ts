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
    join(
      tmpdir(),
      "control-api-post-phase25-external-restoration-"
    )
  );
  tempDirectories.push(root);

  const postPhase25ExternalRestorationStatePath = join(
    root,
    "infra",
    "data",
    "post-phase25-external-restoration",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postPhase25ExternalRestorationStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase25ExternalRestorationStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postPhase25ExternalRestorationStatePath,
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

describe("internal post-phase25 external restoration route", () => {
  it("returns latest null when no post-phase25 external restoration state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase25-external-restoration/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest post-phase25 external restoration payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-12T09:30:00.000Z",
      scriptCompatibilityVersion: "phase26-ubuntu-sync-recovery-v1",
      canonicalPublicUpstream: "ubuntu_nginx_to_127.0.0.1:4010",
      ubuntuSshReachable: true,
      reverseTunnelTaskStatus: {
        exists: true,
        state: "Running"
      },
      ubuntuTunnelListenerStatus: {
        reachable: true,
        allRequiredPresent: true
      },
      readyWorkerCount: 7,
      externalHealthStatus: {
        ok: true,
        statusCode: 200
      },
      externalModelsStatus: {
        ok: true,
        statusCode: 200
      },
      externalChatStatus: {
        ok: true,
        statusCode: 200,
        workerId: "shared-2"
      },
      verdict: "externally_ready"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase25-external-restoration/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase26-ubuntu-sync-recovery-v1"
    );
    expect(response.body.latest.ubuntuSshReachable).toBe(true);
    expect(response.body.latest.reverseTunnelTaskStatus.state).toBe("Running");
    expect(response.body.latest.ubuntuTunnelListenerStatus.allRequiredPresent).toBe(
      true
    );
    expect(response.body.latest.externalChatStatus.workerId).toBe("shared-2");
    expect(response.body.latest.verdict).toBe("externally_ready");
  });

  it("parses a UTF-8 BOM-prefixed post-phase25 external restoration artifact without failing", async () => {
    const root = mkdtempSync(
      join(
        tmpdir(),
        "control-api-post-phase25-external-restoration-bom-"
      )
    );
    tempDirectories.push(root);

    const postPhase25ExternalRestorationStatePath = join(
      root,
      "infra",
      "data",
      "post-phase25-external-restoration",
      "latest.json"
    );
    const latestState = {
      scriptCompatibilityVersion: "phase26-ubuntu-sync-recovery-v1",
      ubuntuSshReachable: true,
      reverseTunnelTaskStatus: {
        state: "Running"
      },
      ubuntuTunnelListenerStatus: {
        allRequiredPresent: true
      },
      externalChatStatus: {
        ok: true,
        statusCode: 200
      },
      verdict: "externally_ready"
    };

    mkdirSync(dirname(postPhase25ExternalRestorationStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase25ExternalRestorationStatePath,
      "\uFEFF" + JSON.stringify(latestState, null, 2),
      "utf8"
    );

    const config: ControlApiConfig = {
      serviceName: "control-api",
      host: "127.0.0.1",
      port: 0,
      internalAdminToken: "secret",
      postPhase25ExternalRestorationStatePath,
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
      .get("/internal/post-phase25-external-restoration/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
