import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatBootstrapStore } from "../src/chat/chat-bootstrap-store.js";
import {
  ChatBootstrapService
} from "../src/chat/chat-bootstrap-service.js";
import type { ChatBootstrapTransport } from "../src/chat/chat-bootstrap-types.js";
import { SessionService } from "../src/sessions/session-service.js";
import { SessionStore } from "../src/sessions/session-store.js";
import { createWorkerRegistry } from "../src/workers/worker-registry.js";

const tempDirectories: string[] = [];

function createRuntime(
  transport?: ChatBootstrapTransport
) {
  const root = mkdtempSync(join(tmpdir(), "control-api-chat-bootstrap-"));
  tempDirectories.push(root);

  const databasePath = join(root, "session-routing.sqlite");
  const chatBootstrapStore = new ChatBootstrapStore(databasePath);
  const bootstrapRecords = new Map();
  const sessionService = new SessionService({
    store: new SessionStore(databasePath),
    workerRegistry: createWorkerRegistry([
      {
        workerId: "dad",
        displayName: "Dad",
        containerName: "worker-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl: "http://worker-dad:4020",
        defaultStatus: "ready"
      }
    ]),
    sessionDurationMinutes: 60,
    sweepIntervalMs: 5_000,
    getChatBootstrap(sessionId) {
      return bootstrapRecords.get(sessionId) ?? null;
    }
  });

  const effectiveTransport = transport ?? {
    async bootstrap() {
      return {
        status: "ready",
        conversationMode: "temporary",
        modelLabel: "GPT-5.4 Thinking",
        failureCode: null
      };
    }
  } satisfies ChatBootstrapTransport;

  const service = new ChatBootstrapService({
    store: chatBootstrapStore,
    sessionService,
    transport: effectiveTransport
  });

  return {
    service,
    sessionService,
    store: chatBootstrapStore,
    dispose() {
      sessionService.close();
      chatBootstrapStore.close();
    }
  };
}

afterEach(() => {
  vi.restoreAllMocks();

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

describe("ChatBootstrapService", () => {
  it("schedules a pending bootstrap and resolves it to ready", async () => {
    const runtime = createRuntime();
    const session = runtime.sessionService.createSession(
      "Bootstrap Ready",
      new Date("2026-03-28T09:00:00.000Z")
    );

    const pending = runtime.service.scheduleBootstrapForSession(
      session,
      new Date("2026-03-28T09:00:00.000Z")
    );

    expect(pending?.status).toBe("pending");

    await Promise.resolve();
    await Promise.resolve();

    const stored = runtime.store.getBootstrap(session.session.sessionId);
    expect(stored).toMatchObject({
      status: "ready",
      conversationMode: "temporary",
      modelLabel: "GPT-5.4 Thinking",
      failureCode: null
    });

    runtime.dispose();
  });

  it("marks the bootstrap failed when the worker transport fails", async () => {
    const runtime = createRuntime({
      async bootstrap() {
        return {
          status: "failed",
          conversationMode: "unknown",
          modelLabel: null,
          failureCode: "temporary_chat_unavailable"
        };
      }
    });
    const session = runtime.sessionService.createSession(
      "Bootstrap Failed",
      new Date("2026-03-28T09:00:00.000Z")
    );

    runtime.service.scheduleBootstrapForSession(
      session,
      new Date("2026-03-28T09:00:00.000Z")
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(runtime.store.getBootstrap(session.session.sessionId)).toMatchObject({
      status: "failed",
      failureCode: "temporary_chat_unavailable"
    });

    runtime.dispose();
  });

  it("preserves a GPT-5.4 alias model label returned by the worker", async () => {
    const runtime = createRuntime({
      async bootstrap() {
        return {
          status: "ready",
          conversationMode: "temporary",
          modelLabel: "GPT-5.4",
          failureCode: null
        };
      }
    });
    const session = runtime.sessionService.createSession(
      "Bootstrap Alias",
      new Date("2026-03-28T09:00:00.000Z")
    );

    runtime.service.scheduleBootstrapForSession(
      session,
      new Date("2026-03-28T09:00:00.000Z")
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(runtime.store.getBootstrap(session.session.sessionId)).toMatchObject({
      status: "ready",
      conversationMode: "temporary",
      modelLabel: "GPT-5.4",
      failureCode: null
    });

    runtime.dispose();
  });
});
