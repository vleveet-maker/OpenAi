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
      "control-api-post-phase24-external-api-readiness-"
    )
  );
  tempDirectories.push(root);

  const postPhase24ExternalApiReadinessStatePath = join(
    root,
    "infra",
    "data",
    "post-phase24-external-api-readiness",
    "latest.json"
  );

  if (latestState) {
    mkdirSync(dirname(postPhase24ExternalApiReadinessStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase24ExternalApiReadinessStatePath,
      JSON.stringify(latestState, null, 2),
      "utf8"
    );
  }

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    postPhase24ExternalApiReadinessStatePath,
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

describe("internal post-phase24 external API readiness route", () => {
  it("returns latest null when no post-phase24 external API readiness state exists", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase24-external-api-readiness/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: null
    });
  });

  it("returns the parsed latest post-phase24 external API readiness payload when it exists", async () => {
    const latestState = {
      generatedAt: "2026-04-12T08:40:00.000Z",
      scriptCompatibilityVersion: "phase25-live-fix-backport-v1",
      canonicalPublicUpstream: "ubuntu_nginx_to_127.0.0.1:4010",
      windowsCaddyPresent: false,
      reverseTunnelTaskName: "OWMCGP Browser Block - Reverse Tunnels",
      reverseTunnelTaskStatus: {
        exists: true,
        state: "Running"
      },
      ubuntuTunnelListenerStatus: {
        reachable: true,
        allRequiredPresent: true
      },
      readyWorkerCount: 7,
      verdict: "ready_for_external_smoke"
    };
    const { app, runtime } = createTestRuntime(latestState);
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/post-phase24-external-api-readiness/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
    expect(response.body.latest.scriptCompatibilityVersion).toBe(
      "phase25-live-fix-backport-v1"
    );
    expect(response.body.latest.canonicalPublicUpstream).toBe(
      "ubuntu_nginx_to_127.0.0.1:4010"
    );
    expect(response.body.latest.reverseTunnelTaskStatus.state).toBe("Running");
    expect(response.body.latest.ubuntuTunnelListenerStatus.allRequiredPresent).toBe(
      true
    );
    expect(response.body.latest.readyWorkerCount).toBe(7);
    expect(response.body.latest.verdict).toBe("ready_for_external_smoke");
  });

  it("parses a UTF-8 BOM-prefixed post-phase24 external API readiness artifact without failing", async () => {
    const root = mkdtempSync(
      join(
        tmpdir(),
        "control-api-post-phase24-external-api-readiness-bom-"
      )
    );
    tempDirectories.push(root);

    const postPhase24ExternalApiReadinessStatePath = join(
      root,
      "infra",
      "data",
      "post-phase24-external-api-readiness",
      "latest.json"
    );
    const latestState = {
      scriptCompatibilityVersion: "phase25-live-fix-backport-v1",
      canonicalPublicUpstream: "ubuntu_nginx_to_127.0.0.1:4010",
      reverseTunnelTaskStatus: {
        state: "Running"
      },
      ubuntuTunnelListenerStatus: {
        allRequiredPresent: true
      },
      readyWorkerCount: 7,
      verdict: "ready_for_external_smoke"
    };

    mkdirSync(dirname(postPhase24ExternalApiReadinessStatePath), {
      recursive: true
    });
    writeFileSync(
      postPhase24ExternalApiReadinessStatePath,
      "\uFEFF" + JSON.stringify(latestState, null, 2),
      "utf8"
    );

    const config: ControlApiConfig = {
      serviceName: "control-api",
      host: "127.0.0.1",
      port: 0,
      internalAdminToken: "secret",
      postPhase24ExternalApiReadinessStatePath,
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
      .get("/internal/post-phase24-external-api-readiness/latest")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.body).toEqual({
      latest: latestState
    });
  });
});
