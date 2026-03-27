import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";

const tempDirectories: string[] = [];

function createTestRuntime() {
  const root = mkdtempSync(join(tmpdir(), "control-api-route-test-"));
  tempDirectories.push(root);

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    sessionDatabasePath: join(root, "session-routing.sqlite"),
    sessionDurationMinutes: 60,
    sessionSweepIntervalMs: 5_000,
    sessionClientDistPath: join(root, "missing-client-dist"),
    workerDefinitions: [
      {
        workerId: "dad",
        displayName: "Dad",
        containerName: "worker-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl: "http://worker-dad:4020",
        defaultStatus: "ready"
      },
      {
        workerId: "wife",
        displayName: "Wife",
        containerName: "worker-wife",
        profilePath: "/profiles/wife",
        agentBaseUrl: "http://worker-wife:4020",
        defaultStatus: "ready"
      }
    ]
  };

  const runtime = createControlApiRuntime(config);
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app
  };
}

afterEach(() => {
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

describe("public session routes", () => {
  it("creates sessions and hides internal worker data", async () => {
    const { app, runtime } = createTestRuntime();

    const response = await request(app)
      .post("/api/sessions")
      .send({
        requestedForLabel: "Family Shared"
      })
      .expect(201);

    expect(response.body.session.requestedForLabel).toBe("Family Shared");
    expect(response.body.session.state).toBe("active");
    expect(response.body.worker.displayName).toBe("Dad");
    expect(response.body.worker.profilePath).toBeUndefined();
    expect(response.body.worker.recoveryUrl).toBeUndefined();

    runtime.dispose();
  });

  it("returns queued position and promotes after release", async () => {
    const { app, runtime } = createTestRuntime();

    const first = await request(app)
      .post("/api/sessions")
      .send({
        requestedForLabel: "First"
      })
      .expect(201);
    await request(app)
      .post("/api/sessions")
      .send({
        requestedForLabel: "Second"
      })
      .expect(201);
    const queued = await request(app)
      .post("/api/sessions")
      .send({
        requestedForLabel: "Queued"
      })
      .expect(201);

    expect(queued.body.session.state).toBe("queued");
    expect(queued.body.queuePosition).toBe(1);

    await request(app)
      .post(`/api/sessions/${first.body.session.sessionId}/end`)
      .expect(200);

    const promoted = await request(app)
      .get(`/api/sessions/${queued.body.session.sessionId}`)
      .expect(200);

    expect(promoted.body.session.state).toBe("active");
    expect(promoted.body.queuePosition).toBeNull();

    runtime.dispose();
  });

  it("rejects invalid transitions", async () => {
    const { app, runtime } = createTestRuntime();
    const session = await request(app)
      .post("/api/sessions")
      .send({
        requestedForLabel: "Needs End"
      })
      .expect(201);

    await request(app)
      .post(`/api/sessions/${session.body.session.sessionId}/cancel`)
      .expect(409);

    await request(app)
      .post(`/api/sessions/${session.body.session.sessionId}/end`)
      .expect(200);

    await request(app)
      .post(`/api/sessions/${session.body.session.sessionId}/end`)
      .expect(409);

    runtime.dispose();
  });
});
