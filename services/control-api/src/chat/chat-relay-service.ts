import { randomUUID } from "node:crypto";

import type { SessionService } from "../sessions/session-service.js";
import type { SessionSnapshot } from "../sessions/session-types.js";
import { ChatStore } from "./chat-store.js";
import type {
  ChatRelayTransport,
  ConversationSnapshot,
  RelayDispatchRequest,
  RelayDispatchResult,
  SessionMessageRecord
} from "./chat-types.js";

const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 4_000;
const DEFAULT_TRANSPORT_FAILURE = "relay_dispatch_failed";

export class ChatRelayServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly detail: string
  ) {
    super(detail);
  }
}

export interface ChatRelayServiceOptions {
  chatStore: ChatStore;
  sessionService: SessionService;
  relayTransport: ChatRelayTransport;
}

export class ChatRelayService {
  constructor(private readonly options: ChatRelayServiceOptions) {}

  getConversationSnapshot(
    sessionId: string
  ): ConversationSnapshot | undefined {
    const sessionSnapshot = this.options.sessionService.getSessionSnapshot(sessionId);

    if (!sessionSnapshot) {
      return undefined;
    }

    return this.buildConversationSnapshot(sessionSnapshot);
  }

  sendMessage(
    sessionId: string,
    bodyText: unknown,
    now: Date = new Date()
  ): ConversationSnapshot {
    const sessionSnapshot = this.options.sessionService.getSessionSnapshot(sessionId);

    if (!sessionSnapshot) {
      throw new ChatRelayServiceError(
        404,
        "session_not_found",
        `Session ${sessionId} was not found`
      );
    }

    if (sessionSnapshot.session.state !== "active") {
      throw new ChatRelayServiceError(
        409,
        "session_not_active",
        "Messages can only be sent while the session is active"
      );
    }

    if (!sessionSnapshot.session.workerId) {
      throw new ChatRelayServiceError(
        409,
        "session_worker_unavailable",
        "The active session does not currently have an assigned worker"
      );
    }

    const trimmedBody = this.normalizeMessageBody(bodyText);
    const pendingAssistantMessage = this.options.chatStore.getPendingAssistantMessage(
      sessionId
    );

    if (pendingAssistantMessage) {
      throw new ChatRelayServiceError(
        409,
        "assistant_reply_pending",
        "Wait for the current assistant reply to finish before sending another message"
      );
    }

    const nowIso = now.toISOString();
    const userMessageId = randomUUID();
    const assistantMessageId = randomUUID();
    const workerId = sessionSnapshot.session.workerId;

    this.options.chatStore.insertMessage({
      messageId: userMessageId,
      sessionId,
      workerId,
      role: "user",
      state: "complete",
      body: trimmedBody,
      replyToMessageId: null,
      failureCode: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: nowIso
    });

    this.options.chatStore.insertMessage({
      messageId: assistantMessageId,
      sessionId,
      workerId,
      role: "assistant",
      state: "pending",
      body: "",
      replyToMessageId: userMessageId,
      failureCode: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null
    });

    const dispatchRequest: RelayDispatchRequest = {
      workerId,
      sessionId,
      userMessageId,
      assistantMessageId,
      bodyText: trimmedBody
    };

    void this.options.relayTransport
      .deliver(dispatchRequest)
      .then((result) => {
        this.handleTransportResult(dispatchRequest, result);
      })
      .catch((error: unknown) => {
        const failureCode = this.resolveFailureCode(error);
        this.failAssistantMessage(assistantMessageId, failureCode);
      });

    return this.requireConversationSnapshot(sessionId);
  }

  completeAssistantMessage(
    assistantMessageId: string,
    assistantText: string,
    completedAt: string = new Date().toISOString()
  ): ConversationSnapshot | undefined {
    const trimmedAssistantText = assistantText.trim();

    if (!trimmedAssistantText) {
      return this.failAssistantMessage(
        assistantMessageId,
        "assistant_reply_empty",
        completedAt
      );
    }

    const updatedMessage = this.options.chatStore.completeAssistantMessage(
      assistantMessageId,
      trimmedAssistantText,
      completedAt
    );

    if (!updatedMessage) {
      return undefined;
    }

    return this.requireConversationSnapshot(updatedMessage.sessionId);
  }

  failAssistantMessage(
    assistantMessageId: string,
    failureCode: string,
    failedAt: string = new Date().toISOString()
  ): ConversationSnapshot | undefined {
    const updatedMessage = this.options.chatStore.failAssistantMessage(
      assistantMessageId,
      failureCode,
      failedAt
    );

    if (!updatedMessage) {
      return undefined;
    }

    return this.requireConversationSnapshot(updatedMessage.sessionId);
  }

  private buildConversationSnapshot(
    sessionSnapshot: SessionSnapshot
  ): ConversationSnapshot {
    const messages = this.options.chatStore.listMessagesForSession(
      sessionSnapshot.session.sessionId
    );
    const pendingAssistantMessage = this.options.chatStore.getPendingAssistantMessage(
      sessionSnapshot.session.sessionId
    );

    return {
      sessionId: sessionSnapshot.session.sessionId,
      worker: sessionSnapshot.worker,
      canSend:
        sessionSnapshot.session.state === "active" &&
        Boolean(sessionSnapshot.session.workerId) &&
        !pendingAssistantMessage,
      pendingAssistantMessageId: pendingAssistantMessage?.messageId ?? null,
      messages
    };
  }

  private requireConversationSnapshot(sessionId: string): ConversationSnapshot {
    const snapshot = this.getConversationSnapshot(sessionId);

    if (!snapshot) {
      throw new Error(`Conversation snapshot missing for session ${sessionId}`);
    }

    return snapshot;
  }

  private normalizeMessageBody(bodyText: unknown): string {
    if (typeof bodyText !== "string") {
      throw new ChatRelayServiceError(
        400,
        "invalid_message_body",
        `bodyText must be a trimmed string between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters`
      );
    }

    const trimmedBody = bodyText.trim();

    if (
      trimmedBody.length < MIN_MESSAGE_LENGTH ||
      trimmedBody.length > MAX_MESSAGE_LENGTH
    ) {
      throw new ChatRelayServiceError(
        400,
        "invalid_message_body",
        `bodyText must be a trimmed string between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters`
      );
    }

    return trimmedBody;
  }

  private handleTransportResult(
    request: RelayDispatchRequest,
    result: RelayDispatchResult | void
  ): void {
    if (!result) {
      return;
    }

    if (typeof result.failureCode === "string" && result.failureCode.trim()) {
      this.failAssistantMessage(
        request.assistantMessageId,
        result.failureCode,
        result.completedAt ?? new Date().toISOString()
      );
      return;
    }

    if (typeof result.assistantText === "string") {
      this.completeAssistantMessage(
        request.assistantMessageId,
        result.assistantText,
        result.completedAt ?? new Date().toISOString()
      );
      return;
    }

    this.failAssistantMessage(
      request.assistantMessageId,
      "relay_result_incomplete"
    );
  }

  private resolveFailureCode(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.trim()
    ) {
      return error.code;
    }

    return DEFAULT_TRANSPORT_FAILURE;
  }
}

export function createChatRelayService(
  options: ChatRelayServiceOptions
): ChatRelayService {
  return new ChatRelayService(options);
}

export function createNoopChatRelayTransport(): ChatRelayTransport {
  return {
    async deliver() {
      return undefined;
    }
  };
}
