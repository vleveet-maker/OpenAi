import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkerDefinition } from "../src/config.js";
import type { SessionChatBootstrapRecord } from "../src/chat/chat-bootstrap-types.js";
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

function createPendingRelayTransport(): ChatRelayTransport {
  return {
    async deliver() {
      return new Promise(() => undefined);
    }
  };
}

function createTestRuntime(relayTransport?: ChatRelayTransport) {
  const root = mkdtempSync(join(tmpdir(), "control-api-chat-test-"));
  tempDirectories.push(root);

  const databasePath = join(root, "session-routing.sqlite");
  const sessionStore = new SessionStore(databasePath);
  const chatStore = new ChatStore(databasePath);
  const workerRegistry = createWorkerRegistry(WORKERS);
  const bootstrapRecords = new Map<string, SessionChatBootstrapRecord>();
  const sessionService = new SessionService({
    store: sessionStore,
    workerRegistry,
    sessionDurationMinutes: 60,
    sweepIntervalMs: 5_000,
    getChatBootstrap(sessionId) {
      return bootstrapRecords.get(sessionId) ?? null;
    },
    onSessionActivated(snapshot, now) {
      if (!snapshot.session.workerId) {
        return;
      }

      bootstrapRecords.set(snapshot.session.sessionId, {
        sessionId: snapshot.session.sessionId,
        workerId: snapshot.session.workerId,
        status: "ready",
        conversationMode: "temporary",
        modelLabel: "GPT-5.4 Thinking",
        failureCode: null,
        requestedAt: now.toISOString(),
        completedAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }
  });

  sessionService.bootstrap(new Date("2026-03-27T10:00:00.000Z"));

  const effectiveRelayTransport =
    relayTransport ?? createPendingRelayTransport();

  const chatRelayService = new ChatRelayService({
    chatStore,
    sessionService,
    relayTransport: effectiveRelayTransport
  });

  return {
    chatRelayService,
    sessionService,
    setBootstrapRecord(
      sessionId: string,
      record: SessionChatBootstrapRecord
    ) {
      bootstrapRecords.set(sessionId, record);
    },
    dispose() {
      chatRelayService.stopBackgroundRetrySweep();
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

describe("ChatRelayService", () => {
  it("creates a user message and pending assistant placeholder", () => {
    const relayTransport = {
      deliver: vi.fn(() => new Promise(() => undefined))
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
    expect(snapshot.relay).toMatchObject({
      status: "dispatching",
      attemptCount: 1,
      maxAttempts: 3
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
      "2026-03-27T10:01:00.000Z",
      "2026-03-27T10:00:10.000Z"
    );

    expect(completedSnapshot?.messages[1]).toMatchObject({
      role: "assistant",
      state: "complete",
      body: "Doing great!"
    });
    expect(completedSnapshot?.relay.status).toBe("completed");
    expect(completedSnapshot?.canSend).toBe(true);

    const secondSnapshot = runtime.chatRelayService.sendMessage(
      session.session.sessionId,
      "Tell me more"
    );
    const failedSnapshot = runtime.chatRelayService.failAssistantMessage(
      secondSnapshot.pendingAssistantMessageId!,
      "reply_timeout",
      "2026-03-27T10:02:00.000Z",
      "fatal",
      "capture",
      "2026-03-27T10:01:10.000Z"
    );

    const failedMessage = failedSnapshot?.messages.at(-1);
    expect(failedMessage).toMatchObject({
      role: "assistant",
      state: "failed",
      failureCode: "reply_timeout"
    });
    expect(failedSnapshot?.relay.status).toBe("failed");
    expect(failedSnapshot?.canSend).toBe(true);
  });

  it("does not create a second user message when a transient attempt retries", async () => {
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
        .mockResolvedValueOnce({
          assistantText: "Recovered answer",
          completedAt: "2026-03-27T10:00:03.000Z",
          submittedAt: "2026-03-27T10:00:02.100Z"
        })
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Retry Session",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(
      session.session.sessionId,
      "Hello with retry",
      new Date("2026-03-27T10:00:00.000Z")
    );
    await flushQueuedRelayHandlers();

    const retryingSnapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );

    expect(relayTransport.deliver).toHaveBeenCalledTimes(1);
    expect(
      retryingSnapshot?.messages.filter((message) => message.role === "user")
    ).toHaveLength(1);
    expect(retryingSnapshot?.messages.at(-1)).toMatchObject({
      role: "assistant",
      state: "pending"
    });
    expect(retryingSnapshot?.relay).toMatchObject({
      status: "retrying",
      attemptCount: 1,
      maxAttempts: 3
    });

    vi.setSystemTime(new Date("2026-03-27T10:00:02.000Z"));
    runtime.chatRelayService.runRetrySweep(new Date());
    await flushQueuedRelayHandlers();

    const completedSnapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );

    expect(relayTransport.deliver).toHaveBeenCalledTimes(2);
    expect(
      completedSnapshot?.messages.filter((message) => message.role === "user")
    ).toHaveLength(1);
    expect(completedSnapshot?.messages.at(-1)).toMatchObject({
      role: "assistant",
      state: "complete",
      body: "Recovered answer"
    });
    expect(completedSnapshot?.relay.status).toBe("completed");
  });

  it("does not retry after submit was acknowledged", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const relayTransport = {
      deliver: vi.fn().mockResolvedValue({
        failureCode: "reply_timeout",
        failureClass: "transient",
        failureStage: "submitted",
        submittedAt: "2026-03-27T10:00:00.100Z",
        completedAt: "2026-03-27T10:00:30.000Z"
      })
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Submitted Failure",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");
    await flushQueuedRelayHandlers();

    vi.setSystemTime(new Date("2026-03-27T10:00:10.000Z"));
    runtime.chatRelayService.runRetrySweep(new Date());
    await flushQueuedRelayHandlers();

    const snapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );

    expect(relayTransport.deliver).toHaveBeenCalledTimes(1);
    expect(snapshot?.messages.at(-1)).toMatchObject({
      role: "assistant",
      state: "failed",
      failureCode: "reply_timeout"
    });
    expect(snapshot?.relay).toMatchObject({
      status: "failed",
      attemptCount: 1,
      lastFailureCode: "reply_timeout"
    });
  });

  it("stops retrying after three total attempts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const relayTransport = {
      deliver: vi
        .fn<ChatRelayTransport["deliver"]>()
        .mockRejectedValue(
          Object.assign(new Error("worker down"), {
            code: "worker_relay_unreachable"
          })
        )
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Retry Exhausted",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");
    await flushQueuedRelayHandlers();

    vi.setSystemTime(new Date("2026-03-27T10:00:02.000Z"));
    runtime.chatRelayService.runRetrySweep(new Date());
    await flushQueuedRelayHandlers();

    vi.setSystemTime(new Date("2026-03-27T10:00:07.000Z"));
    runtime.chatRelayService.runRetrySweep(new Date());
    await flushQueuedRelayHandlers();

    vi.setSystemTime(new Date("2026-03-27T10:00:15.000Z"));
    runtime.chatRelayService.runRetrySweep(new Date());
    await flushQueuedRelayHandlers();

    const snapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );

    expect(relayTransport.deliver).toHaveBeenCalledTimes(3);
    expect(snapshot?.messages.at(-1)).toMatchObject({
      role: "assistant",
      state: "failed",
      failureCode: "worker_relay_unreachable"
    });
    expect(snapshot?.relay).toMatchObject({
      status: "failed",
      attemptCount: 3,
      maxAttempts: 3,
      lastFailureCode: "worker_relay_unreachable"
    });
  });

  it("leaves one failed assistant message visible after a terminal failure", async () => {
    const relayTransport = {
      deliver: vi.fn().mockResolvedValue({
        failureCode: "selector_not_found",
        failureClass: "fatal",
        failureStage: "dispatch",
        completedAt: "2026-03-27T10:00:01.000Z"
      })
    } satisfies ChatRelayTransport;
    const runtime = createTestRuntime(relayTransport);
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Terminal Failure",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello");
    await flushQueuedRelayHandlers();

    const snapshot = runtime.chatRelayService.getConversationSnapshot(
      session.session.sessionId
    );

    expect(snapshot?.messages).toHaveLength(2);
    expect(snapshot?.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
    expect(snapshot?.messages.at(-1)).toMatchObject({
      role: "assistant",
      state: "failed",
      failureCode: "selector_not_found"
    });
    expect(snapshot?.relay.status).toBe("failed");
  });

  it("blocks sending when fresh chat bootstrap failed", () => {
    const runtime = createTestRuntime();
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });
    const session = runtime.sessionService.createSession(
      "Bootstrap Failed",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.setBootstrapRecord(session.session.sessionId, {
      sessionId: session.session.sessionId,
      workerId: "dad",
      status: "failed",
      conversationMode: "unknown",
      modelLabel: null,
      failureCode: "temporary_chat_unavailable",
      requestedAt: "2026-03-27T10:00:00.000Z",
      completedAt: "2026-03-27T10:00:01.000Z",
      updatedAt: "2026-03-27T10:00:01.000Z"
    });

    expect(() =>
      runtime.chatRelayService.sendMessage(session.session.sessionId, "Hello")
    ).toThrowError(
      expect.objectContaining<Partial<ChatRelayServiceError>>({
        code: "chat_bootstrap_failed"
      })
    );
  });
});
