import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkerDefinition } from "../src/config.js";
import { ChatStore } from "../src/chat/chat-store.js";
import {
  ChatRelayService,
  ChatRelayServiceError
} from "../src/chat/chat-relay-service.js";
import type { ChatRelayTransport } from "../src/chat/chat-types.js";
import { SessionService } from "../src/sessions/session-service.js";
import { SessionStore } from "../src/sessions/session-store.js";
import { createWorkerRegistry } from "../src/workers/worker-registry.js";

const WORKERS: WorkerDefinition[] = [
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
];

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime(relayTransport?: ChatRelayTransport) {
  const root = mkdtempSync(join(tmpdir(), "control-api-chat-test-"));
  tempDirectories.push(root);

  const databasePath = join(root, "session-routing.sqlite");
  const sessionStore = new SessionStore(databasePath);
  const chatStore = new ChatStore(databasePath);
  const workerRegistry = createWorkerRegistry(WORKERS);
  const sessionService = new SessionService({
    store: sessionStore,
    workerRegistry,
    sessionDurationMinutes: 60,
    sweepIntervalMs: 5_000
  });

  sessionService.bootstrap(new Date("2026-03-27T10:00:00.000Z"));

  const effectiveRelayTransport =
    relayTransport ??
    ({
      async deliver() {
        return undefined;
      }
    } satisfies ChatRelayTransport);

  const chatRelayService = new ChatRelayService({
    chatStore,
    sessionService,
    relayTransport: effectiveRelayTransport
  });

  return {
    chatRelayService,
    sessionService,
    dispose() {
      sessionService.close();
      chatStore.close();
    }
  };
}

async function flushQueuedRelayHandlers() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
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

describe("ChatRelayService", () => {
  it("creates a user message and pending assistant placeholder", () => {
    const relayTransport = {
      deliver: vi.fn().mockResolvedValue(undefined)
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Family Shared",
      new Date("2026-03-27T10:00:00.000Z")
    );

    const snapshot = runtime.chatRelayService.sendMessage(
      session.session.sessionId,
      "  Hello family chat  ",
      new Date("2026-03-27T10:01:00.000Z")
    );

    expect(snapshot.canSend).toBe(false);
    expect(snapshot.pendingAssistantMessageId).not.toBeNull();
    expect(snapshot.messages).toHaveLength(2);
    expect(snapshot.messages[0]).toMatchObject({
      role: "user",
      state: "complete",
      body: "Hello family chat"
    });
    expect(snapshot.messages[1]).toMatchObject({
      role: "assistant",
      state: "pending",
      body: "",
      replyToMessageId: snapshot.messages[0]?.messageId
    });
    expect(relayTransport.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        workerId: "dad",
        sessionId: session.session.sessionId,
        assistantMessageId: snapshot.pendingAssistantMessageId,
        bodyText: "Hello family chat"
      })
    );
  });

  it("rejects sends outside active sessions", () => {
    const runtime = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const first = runtime.sessionService.createSession(
      "First",
      new Date("2026-03-27T10:00:00.000Z")
    );
    runtime.sessionService.createSession(
      "Second",
      new Date("2026-03-27T10:01:00.000Z")
    );
    const queued = runtime.sessionService.createSession(
      "Queued",
      new Date("2026-03-27T10:02:00.000Z")
    );

    expect(() =>
      runtime.chatRelayService.sendMessage(
        queued.session.sessionId,
        "Queued hello"
      )
    ).toThrowError(
      expect.objectContaining<Partial<ChatRelayServiceError>>({
        code: "session_not_active"
      })
    );

    runtime.sessionService.endActiveSession(
      first.session.sessionId,
      "manual_end",
      new Date("2026-03-27T10:03:00.000Z")
    );
    expect(() =>
      runtime.chatRelayService.sendMessage(
        first.session.sessionId,
        "Ended hello"
      )
    ).toThrowError(
      expect.objectContaining<Partial<ChatRelayServiceError>>({
        code: "session_not_active"
      })
    );
  });

  it("rejects a second send while an assistant reply is pending", () => {
    const runtime = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Pending Session",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "First");

    expect(() =>
      runtime.chatRelayService.sendMessage(session.session.sessionId, "Second")
    ).toThrowError(
      expect.objectContaining<Partial<ChatRelayServiceError>>({
        code: "assistant_reply_pending"
      })
    );
  });

  it("updates stored conversation when the assistant reply completes or fails", () => {
    const runtime = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Reply Session",
      new Date("2026-03-27T10:00:00.000Z")
    );

    const firstSnapshot = runtime.chatRelayService.sendMessage(
      session.session.sessionId,
      "How are you?"
    );

    const completedSnapshot = runtime.chatRelayService.completeAssistantMessage(
      firstSnapshot.pendingAssistantMessageId!,
      "Doing great!",
      "2026-03-27T10:01:00.000Z"
    );

    expect(completedSnapshot?.messages[1]).toMatchObject({
      role: "assistant",
      state: "complete",
      body: "Doing great!"
    });
    expect(completedSnapshot?.canSend).toBe(true);

    const secondSnapshot = runtime.chatRelayService.sendMessage(
      session.session.sessionId,
      "Tell me more"
    );
    const failedSnapshot = runtime.chatRelayService.failAssistantMessage(
      secondSnapshot.pendingAssistantMessageId!,
      "reply_timeout",
      "2026-03-27T10:02:00.000Z"
    );

    const failedMessage = failedSnapshot?.messages.at(-1);
    expect(failedMessage).toMatchObject({
      role: "assistant",
      state: "failed",
      failureCode: "reply_timeout"
    });
    expect(failedSnapshot?.canSend).toBe(true);
  });

  it("completes the pending assistant message when relay delivery resolves", async () => {
    const relayTransport = {
      async deliver() {
        return {
          assistantText: "Completed from transport",
          completedAt: "2026-03-27T10:01:00.000Z"
        };
      }
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Async Success",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");
    await flushQueuedRelayHandlers();

    const snapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );
    const assistantMessage = snapshot?.messages.at(-1);

    expect(assistantMessage).toMatchObject({
      role: "assistant",
      state: "complete",
      body: "Completed from transport"
    });
  });

  it("marks the pending assistant message failed when relay delivery fails", async () => {
    const relayTransport = {
      async deliver() {
        throw Object.assign(new Error("worker down"), {
          code: "worker_unreachable"
        });
      }
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Async Failure",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");
    await flushQueuedRelayHandlers();

    const snapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );
    const assistantMessage = snapshot?.messages.at(-1);

    expect(assistantMessage).toMatchObject({
      role: "assistant",
      state: "failed",
      failureCode: "worker_unreachable"
    });
  });
});
