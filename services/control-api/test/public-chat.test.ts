import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatRelayTransport } from "../src/chat/chat-types.js";
import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createPendingRelayTransport(): ChatRelayTransport {
  return {
    async deliver() {
      return new Promise(() => undefined);
    }
  };
}

function createTestRuntime(relayTransport: ChatRelayTransport = createPendingRelayTransport()) {
  const root = mkdtempSync(join(tmpdir(), "control-api-public-chat-"));
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
    dockerSocketPath: "/var/run/docker.sock",
    workerHealthPollIntervalMs: 5_000,
    workerHealthTimeoutMs: 3_000,
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

  const runtime = createControlApiRuntime(config, {
    relayTransport
  });
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app
  };
}

afterEach(() => {
  vi.useRealTimers();

  while (cleanupCallbacks.length > 0) {
    const cleanup = cleanupCallbacks.pop();
    cleanup?.();
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

describe("public chat routes", () => {
  it("lists conversation history for an active session", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Active Chat",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");

    const response = await request(app)
      .get(`/api/sessions/${session.session.sessionId}/messages`)
      .expect(200);

    expect(response.body.sessionId).toBe(session.session.sessionId);
    expect(response.body.messages).toHaveLength(2);
    expect(response.body.pendingAssistantMessageId).toBeDefined();
    expect(response.body.worker.displayName).toBe("Dad");
    expect(response.body.relay).toMatchObject({
      status: "dispatching",
      attemptCount: 1,
      maxAttempts: 3
    });
  });

  it("accepts a message for an active session and does not expose internal worker fields", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Send Route",
      new Date("2026-03-27T10:00:00.000Z")
    );

    const response = await request(app)
      .post(`/api/sessions/${session.session.sessionId}/messages`)
      .send({
        bodyText: "Hello from route"
      })
      .expect(202);

    expect(response.body.pendingAssistantMessageId).toBeTruthy();
    expect(response.body.canSend).toBe(false);
    expect(response.body.messages[0].body).toBe("Hello from route");
    expect(response.body.worker.profilePath).toBeUndefined();
    expect(response.body.worker.recoveryUrl).toBeUndefined();
    expect(response.body.relay).toMatchObject({
      status: "dispatching",
      attemptCount: 1,
      maxAttempts: 3
    });
  });

  it("rejects invalid body text", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Validation",
      new Date("2026-03-27T10:00:00.000Z")
    );

    const response = await request(app)
      .post(`/api/sessions/${session.session.sessionId}/messages`)
      .send({
        bodyText: "   "
      })
      .expect(400);

    expect(response.body.error).toBe("invalid_message_body");
  });

  it("rejects sends for inactive sessions", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Inactive",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.sessionService.endActiveSession(
      session.session.sessionId,
      "manual_end",
      new Date("2026-03-27T10:05:00.000Z")
    );

    const response = await request(app)
      .post(`/api/sessions/${session.session.sessionId}/messages`)
      .send({
        bodyText: "Should fail"
      })
      .expect(409);

    expect(response.body.error).toBe("session_not_active");
  });

  it("returns relay status in the conversation snapshot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const relayTransport = {
      deliver: vi
        .fn<ChatRelayTransport["deliver"]>()
        .mockRejectedValueOnce(
          Object.assign(new Error("worker down"), {
            code: "worker_relay_unreachable"
          })
        )
    } satisfies ChatRelayTransport;
    const { app, runtime } = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Retry Snapshot",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");
    await Promise.resolve();
    await Promise.resolve();

    const response = await request(app)
      .get(`/api/sessions/${session.session.sessionId}/messages`)
      .expect(200);

    expect(response.body.relay).toMatchObject({
      status: "retrying",
      attemptCount: 1,
      maxAttempts: 3,
      lastFailureCode: "worker_relay_unreachable"
    });
  });
});
