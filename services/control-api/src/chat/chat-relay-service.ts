import { randomUUID } from "node:crypto";

import type { OperatorEventRecorder } from "../observability/operator-events.js";
import type { SessionService } from "../sessions/session-service.js";
import type { SessionSnapshot } from "../sessions/session-types.js";
import { ChatStore } from "./chat-store.js";
import type {
  ChatRelayTransport,
  ConversationSnapshot,
  RelayAttemptStage,
  RelayDispatchRequest,
  RelayDispatchResult,
  RelayFailureClass,
  RelayJobRecord
} from "./chat-types.js";

const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 4_000;
const DEFAULT_TRANSPORT_FAILURE = "relay_dispatch_failed";
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS_BY_ATTEMPT = new Map<number, number>([
  [2, 2_000],
  [3, 5_000]
]);

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
  eventRecorder?: OperatorEventRecorder;
}

export class ChatRelayService {
  private readonly activeDispatches = new Set<string>();
  private backgroundRetrySweep?: NodeJS.Timeout;

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

    const assistantCreatedAt = new Date(now.getTime() + 1).toISOString();

    this.options.chatStore.insertMessage({
      messageId: assistantMessageId,
      sessionId,
      workerId,
      role: "assistant",
      state: "pending",
      body: "",
      replyToMessageId: userMessageId,
      failureCode: null,
      createdAt: assistantCreatedAt,
      updatedAt: assistantCreatedAt,
      completedAt: null
    });

    this.options.chatStore.insertRelayJob({
      assistantMessageId,
      sessionId,
      workerId,
      userMessageId,
      state: "queued",
      attemptCount: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      nextRetryAt: nowIso,
      submittedAt: null,
      completedAt: null,
      lastFailureCode: null,
      lastFailureClass: null,
      lastFailureStage: null
    });

    void this.dispatchRelayJob(assistantMessageId, now);

    return this.requireConversationSnapshot(sessionId);
  }

  completeAssistantMessage(
    assistantMessageId: string,
    assistantText: string,
    completedAt: string = new Date().toISOString(),
    submittedAt: string | null = null
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

    this.options.chatStore.completeRelayJob(
      assistantMessageId,
      completedAt,
      submittedAt
    );

    return this.requireConversationSnapshot(updatedMessage.sessionId);
  }

  failAssistantMessage(
    assistantMessageId: string,
    failureCode: string,
    failedAt: string = new Date().toISOString(),
    failureClass: RelayFailureClass = "fatal",
    failureStage: RelayAttemptStage = "capture",
    submittedAt: string | null = null
  ): ConversationSnapshot | undefined {
    const updatedMessage = this.options.chatStore.failAssistantMessage(
      assistantMessageId,
      failureCode,
      failedAt
    );

    if (!updatedMessage) {
      return undefined;
    }

    this.options.chatStore.failRelayJob(
      assistantMessageId,
      failureCode,
      failureClass,
      failureStage,
      failedAt,
      submittedAt
    );

    return this.requireConversationSnapshot(updatedMessage.sessionId);
  }

  startBackgroundRetrySweep(intervalMs: number): void {
    if (this.backgroundRetrySweep) {
      return;
    }

    this.backgroundRetrySweep = setInterval(() => {
      this.runRetrySweep();
    }, intervalMs);

    this.backgroundRetrySweep.unref();
  }

  stopBackgroundRetrySweep(): void {
    if (!this.backgroundRetrySweep) {
      return;
    }

    clearInterval(this.backgroundRetrySweep);
    this.backgroundRetrySweep = undefined;
  }

  runRetrySweep(now: Date = new Date()): void {
    const jobs = this.options.chatStore.listRetryableRelayJobs(now.toISOString());

    for (const job of jobs) {
      void this.dispatchRelayJob(job.assistantMessageId, now);
    }
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
      relay: this.options.chatStore.getRelayStatusForSession(
        sessionSnapshot.session.sessionId
      ),
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

  private async dispatchRelayJob(
    assistantMessageId: string,
    now: Date = new Date()
  ): Promise<void> {
    if (this.activeDispatches.has(assistantMessageId)) {
      return;
    }

    const currentJob = this.options.chatStore.getRelayJob(assistantMessageId);

    if (!currentJob || currentJob.state === "completed" || currentJob.state === "failed") {
      return;
    }

    const sessionSnapshot = this.options.sessionService.getSessionSnapshot(
      currentJob.sessionId
    );

    if (
      !sessionSnapshot ||
      sessionSnapshot.session.state !== "active" ||
      sessionSnapshot.session.workerId !== currentJob.workerId
    ) {
      this.handleTransportFailure(currentJob, {
        failureCode: "session_not_active",
        failureClass: "fatal",
        failureStage: "dispatch",
        completedAt: now.toISOString()
      });
      return;
    }

    const userMessage = this.options.chatStore.getMessage(currentJob.userMessageId);

    if (!userMessage) {
      this.handleTransportFailure(currentJob, {
        failureCode: "relay_user_message_missing",
        failureClass: "fatal",
        failureStage: "dispatch",
        completedAt: now.toISOString()
      });
      return;
    }

    const dispatchJob = this.options.chatStore.startRelayAttempt(
      assistantMessageId,
      now.toISOString()
    );

    if (!dispatchJob) {
      return;
    }

    const dispatchRequest: RelayDispatchRequest = {
      workerId: dispatchJob.workerId,
      sessionId: dispatchJob.sessionId,
      userMessageId: dispatchJob.userMessageId,
      assistantMessageId: dispatchJob.assistantMessageId,
      bodyText: userMessage.body
    };

    this.activeDispatches.add(assistantMessageId);

    try {
      const result = await this.options.relayTransport.deliver(dispatchRequest);
      this.handleTransportResult(dispatchJob, result);
    } catch (error: unknown) {
      this.handleTransportFailure(dispatchJob, {
        failureCode: this.resolveFailureCode(error),
        failureClass: "transient",
        failureStage: "dispatch",
        completedAt: new Date().toISOString()
      });
    } finally {
      this.activeDispatches.delete(assistantMessageId);
    }
  }

  private handleTransportResult(
    job: RelayJobRecord,
    result: RelayDispatchResult | void
  ): void {
    if (!result) {
      this.handleTransportFailure(job, {
        failureCode: "relay_result_missing",
        failureClass: "fatal",
        failureStage: "dispatch"
      });
      return;
    }

    if (typeof result.failureCode === "string" && result.failureCode.trim()) {
      this.handleTransportFailure(job, {
        failureCode: result.failureCode,
        failureClass: result.failureClass ?? "fatal",
        failureStage:
          result.failureStage ??
          (result.submittedAt ? "capture" : "dispatch"),
        completedAt: result.completedAt,
        submittedAt: result.submittedAt
      });
      return;
    }

    if (typeof result.assistantText === "string") {
      this.completeAssistantMessage(
        job.assistantMessageId,
        result.assistantText,
        result.completedAt ?? new Date().toISOString(),
        result.submittedAt ?? null
      );
      return;
    }

    this.handleTransportFailure(job, {
      failureCode: "relay_result_incomplete",
      failureClass: "fatal",
      failureStage: result.submittedAt ? "capture" : "dispatch",
      completedAt: result.completedAt,
      submittedAt: result.submittedAt
    });
  }

  private handleTransportFailure(
    job: RelayJobRecord,
    details: {
      failureCode: string;
      failureClass: RelayFailureClass;
      failureStage: RelayAttemptStage;
      completedAt?: string;
      submittedAt?: string;
    }
  ): void {
    const currentJob =
      this.options.chatStore.getRelayJob(job.assistantMessageId) ?? job;
    const failedAt = details.completedAt ?? new Date().toISOString();
    const submittedAt = details.submittedAt ?? null;

    if (
      details.failureClass === "transient" &&
      !submittedAt &&
      currentJob.attemptCount < currentJob.maxAttempts
    ) {
      const nextRetryDelayMs = this.getRetryDelayMs(currentJob.attemptCount + 1);

      if (nextRetryDelayMs !== null) {
        const nextRetryAt = new Date(
          Date.parse(failedAt) + nextRetryDelayMs
        ).toISOString();

        this.options.chatStore.scheduleRelayRetry(
          currentJob.assistantMessageId,
          details.failureCode,
          details.failureClass,
          details.failureStage,
          failedAt,
          nextRetryAt
        );
        this.options.eventRecorder?.recordEvent({
          eventType: "relay_retry_scheduled",
          severity: "warn",
          workerId: currentJob.workerId,
          sessionId: currentJob.sessionId,
          summary: `Relay retry scheduled for session ${currentJob.sessionId} on worker ${currentJob.workerId}`,
          detailJson: JSON.stringify({
            assistantMessageId: currentJob.assistantMessageId,
            attemptCount: currentJob.attemptCount,
            maxAttempts: currentJob.maxAttempts,
            failureCode: details.failureCode,
            failureClass: details.failureClass,
            failureStage: details.failureStage,
            nextRetryAt
          }),
          occurredAt: failedAt
        });
        return;
      }
    }

    this.options.eventRecorder?.recordEvent({
      eventType: "relay_terminal_failure",
      severity: "error",
      workerId: currentJob.workerId,
      sessionId: currentJob.sessionId,
      summary: `Relay failed permanently for session ${currentJob.sessionId} on worker ${currentJob.workerId}`,
      detailJson: JSON.stringify({
        assistantMessageId: currentJob.assistantMessageId,
        attemptCount: currentJob.attemptCount,
        maxAttempts: currentJob.maxAttempts,
        failureCode: details.failureCode,
        failureClass: details.failureClass,
        failureStage: details.failureStage,
        submittedAt
      }),
      occurredAt: failedAt
    });

    this.failAssistantMessage(
      currentJob.assistantMessageId,
      details.failureCode,
      failedAt,
      details.failureClass,
      details.failureStage,
      submittedAt
    );
  }

  private getRetryDelayMs(nextAttemptNumber: number): number | null {
    return RETRY_DELAY_MS_BY_ATTEMPT.get(nextAttemptNumber) ?? null;
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
