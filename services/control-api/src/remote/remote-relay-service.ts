import type { SessionSnapshot } from "../sessions/session-types.js";
import type { SessionService } from "../sessions/session-service.js";
import type { ChatRelayService } from "../chat/chat-relay-service.js";
import type { ConversationSnapshot, RelayStatusSnapshot } from "../chat/chat-types.js";

const MIN_LABEL_LENGTH = 1;
const MAX_LABEL_LENGTH = 64;
const POLL_INTERVAL_MS = 150;
const DEFAULT_REQUESTED_FOR_LABEL = "Remote relay";

export interface RemoteRelayHealthSnapshot {
  ok: true;
  service: string;
  mode: "remote_relay";
  topology: string;
  workerCount: number;
}

export interface RemoteRelayAskRequest {
  requestedForLabel?: unknown;
  workerId?: unknown;
  dialogId?: unknown;
  newDialog?: unknown;
  messageText?: unknown;
  timeoutMs?: unknown;
}

export interface RemoteRelayAskResponse {
  dialogId: string;
  sessionId: string;
  workerId: string;
  conversationMode: string;
  modelLabel: string | null;
  assistantReplyText: string;
  relayResult: RelayStatusSnapshot;
}

export interface RemoteRelayEndDialogResponse {
  dialogId: string;
  sessionId: string;
  state: string;
  endReason: string | null;
}

export interface RemoteRelayServiceOptions {
  serviceName: string;
  requestTimeoutMs: number;
  topologyHint: string;
  workerCount: number;
  defaultWorkerId?: string;
  sessionService: SessionService;
  chatRelayService: ChatRelayService;
  findFallbackWorkerId?: () => Promise<string | null>;
  listFallbackWorkerIds?: () => Promise<string[]>;
}

export class RemoteRelayServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly detail: string
  ) {
    super(detail);
  }
}

class RemoteRelayAttemptError extends Error {
  constructor(
    public readonly sessionId: string | null,
    public readonly causeError: unknown
  ) {
    super(
      causeError instanceof Error
        ? causeError.message
        : "remote relay attempt failed"
    );
  }
}

export class RemoteRelayService {
  constructor(private readonly options: RemoteRelayServiceOptions) {}

  getHealth(): RemoteRelayHealthSnapshot {
    return {
      ok: true,
      service: this.options.serviceName,
      mode: "remote_relay",
      topology: this.options.topologyHint,
      workerCount: this.options.workerCount
    };
  }

  async ask(
    request: RemoteRelayAskRequest,
    now: Date = new Date()
  ): Promise<RemoteRelayAskResponse> {
    const timeoutMs = this.parseTimeoutMs(request.timeoutMs);
    const deadline = Date.now() + timeoutMs;
    const createNewDialog = request.newDialog !== false;
    const dialogId = this.parseDialogId(request.dialogId);
    const requestedWorkerId = this.parseWorkerId(request.workerId);
    const requestedForLabel = this.parseRequestedForLabel(request.requestedForLabel);
    const messageText = this.parseMessageText(request.messageText);
    const shouldRetryAcrossWorkers =
      requestedWorkerId === null && (createNewDialog || !dialogId);

    if (shouldRetryAcrossWorkers) {
      const candidateWorkerIds = await this.listCandidateWorkerIds();
      let lastError: unknown = null;

      if (candidateWorkerIds.length > 0) {
        for (const candidateWorkerId of candidateWorkerIds) {
          try {
            return await this.executeAskAttempt({
              requestedForLabel,
              requestedWorkerId: candidateWorkerId,
              dialogId,
              createNewDialog,
              messageText,
              deadline,
              now
            });
          } catch (error: unknown) {
            const attemptError = this.unwrapAttemptError(error);
            lastError = attemptError.error;
            this.cleanupAttemptSession(attemptError.sessionId, now);

            if (!this.isRetryableWorkerAttemptError(lastError)) {
              throw lastError;
            }
          }
        }
      }

      try {
        return await this.executeAskAttempt({
          requestedForLabel,
          requestedWorkerId: null,
          dialogId,
          createNewDialog,
          messageText,
          deadline,
          now,
          useDefaultWorkerId: false
        });
      } catch (error: unknown) {
        const attemptError = this.unwrapAttemptError(error);
        this.cleanupAttemptSession(attemptError.sessionId, now);

        if (lastError && this.isRetryableWorkerAttemptError(attemptError.error)) {
          throw attemptError.error;
        }

        throw attemptError.error;
      }
    }

    try {
      return await this.executeAskAttempt({
        requestedForLabel,
        requestedWorkerId,
        dialogId,
        createNewDialog,
        messageText,
        deadline,
        now
      });
    } catch (error: unknown) {
      const attemptError = this.unwrapAttemptError(error);
      throw attemptError.error;
    }
  }

  endDialog(dialogId: string, now: Date = new Date()): RemoteRelayEndDialogResponse {
    const snapshot = this.options.sessionService.getSessionSnapshot(dialogId);

    if (!snapshot) {
      throw new RemoteRelayServiceError(
        404,
        "dialog_not_found",
        `Dialog ${dialogId} was not found`
      );
    }

    if (snapshot.session.state !== "active") {
      throw new RemoteRelayServiceError(
        409,
        "dialog_not_active",
        `Dialog ${dialogId} is ${snapshot.session.state}`
      );
    }

    const ended = this.options.sessionService.endActiveSession(dialogId, "manual_end", now);

    if (!ended) {
      throw new RemoteRelayServiceError(
        500,
        "dialog_end_failed",
        `Dialog ${dialogId} could not be ended`
      );
    }

    return {
      dialogId,
      sessionId: ended.session.sessionId,
      state: ended.session.state,
      endReason: ended.session.endReason
    };
  }

  private parseRequestedForLabel(value: unknown): string {
    if (typeof value !== "string") {
      return DEFAULT_REQUESTED_FOR_LABEL;
    }

    const trimmed = value.trim();

    if (trimmed.length < MIN_LABEL_LENGTH || trimmed.length > MAX_LABEL_LENGTH) {
      throw new RemoteRelayServiceError(
        400,
        "invalid_requested_for_label",
        `requestedForLabel must be a trimmed string between ${MIN_LABEL_LENGTH} and ${MAX_LABEL_LENGTH} characters`
      );
    }

    return trimmed;
  }

  private parseDialogId(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new RemoteRelayServiceError(
        400,
        "invalid_dialog_id",
        "dialogId must be a non-empty string when provided"
      );
    }

    return value.trim();
  }

  private parseWorkerId(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new RemoteRelayServiceError(
        400,
        "invalid_worker_id",
        "workerId must be a non-empty string when provided"
      );
    }

    return value.trim();
  }

  private parseMessageText(value: unknown): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new RemoteRelayServiceError(
        400,
        "invalid_message_text",
        "messageText must be a non-empty string"
      );
    }

    return value.trim();
  }

  private parseTimeoutMs(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }

    return this.options.requestTimeoutMs;
  }

  private createDialogSession(
    requestedForLabel: string,
    workerId: string | null,
    now: Date
  ): SessionSnapshot {
    if (!workerId) {
      return this.options.sessionService.createSession(requestedForLabel, now);
    }

    try {
      return this.options.sessionService.createPinnedSession(
        workerId,
        requestedForLabel,
        now
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === `Unknown worker for pinned session: ${workerId}`
      ) {
        throw new RemoteRelayServiceError(
          404,
          "requested_worker_not_found",
          `Worker ${workerId} is not part of the remote relay pool`
        );
      }

      throw error;
    }
  }

  private async executeAskAttempt(options: {
    requestedForLabel: string;
    requestedWorkerId: string | null;
    dialogId: string | null;
    createNewDialog: boolean;
    messageText: string;
    deadline: number;
    now: Date;
    useDefaultWorkerId?: boolean;
  }): Promise<RemoteRelayAskResponse> {
    const effectiveWorkerId =
      options.requestedWorkerId ??
      (options.useDefaultWorkerId !== false && (options.createNewDialog || !options.dialogId)
        ? this.options.defaultWorkerId ?? null
        : null);

    let sessionId: string | null = null;

    try {
      if (options.createNewDialog || !options.dialogId) {
        const session = this.createDialogSession(
          options.requestedForLabel,
          effectiveWorkerId,
          options.now
        );
        sessionId = session.session.sessionId;

        if (effectiveWorkerId === null && session.session.state === "queued") {
          sessionId = await this.tryDirectWorkerFallback(
            session.session.sessionId,
            options.requestedForLabel,
            options.now
          );
        }
      } else {
        sessionId = options.dialogId;
      }

      await this.waitForActiveSession(sessionId, options.deadline);
      await this.waitForReadyBootstrap(sessionId, options.deadline);

      this.options.chatRelayService.sendMessage(
        sessionId,
        options.messageText,
        options.now
      );
      const conversation = await this.waitForRelayResult(
        sessionId,
        options.deadline
      );

      const assignedWorkerId = conversation.worker?.workerId;
      const assistantReplyText = this.extractLatestAssistantReply(conversation);

      if (!assignedWorkerId) {
        throw new RemoteRelayServiceError(
          502,
          "remote_relay_worker_missing",
          "Conversation completed without a worker assignment"
        );
      }

      return {
        dialogId: sessionId,
        sessionId,
        workerId: assignedWorkerId,
        conversationMode: conversation.chatBootstrap?.conversationMode ?? "unknown",
        modelLabel: conversation.chatBootstrap?.modelLabel ?? null,
        assistantReplyText,
        relayResult: conversation.relay
      };
    } catch (error: unknown) {
      throw new RemoteRelayAttemptError(sessionId, error);
    }
  }

  private async listCandidateWorkerIds(): Promise<string[]> {
    const ids: string[] = [];

    if (this.options.defaultWorkerId) {
      ids.push(this.options.defaultWorkerId);
    }

    if (this.options.listFallbackWorkerIds) {
      ids.push(...(await this.options.listFallbackWorkerIds()));
    } else {
      const fallbackWorkerId = await this.options.findFallbackWorkerId?.();

      if (fallbackWorkerId) {
        ids.push(fallbackWorkerId);
      }
    }

    return [...new Set(ids.filter((workerId) => workerId.trim().length > 0))];
  }

  private unwrapAttemptError(error: unknown): {
    sessionId: string | null;
    error: unknown;
  } {
    if (error instanceof RemoteRelayAttemptError) {
      return {
        sessionId: error.sessionId,
        error: error.causeError
      };
    }

    return {
      sessionId: null,
      error
    };
  }

  private cleanupAttemptSession(sessionId: string | null, now: Date): void {
    if (!sessionId) {
      return;
    }

    const snapshot = this.options.sessionService.getSessionSnapshot(sessionId);

    if (!snapshot) {
      return;
    }

    if (snapshot.session.state === "queued") {
      this.options.sessionService.cancelQueuedSession(sessionId, now);
      return;
    }

    if (snapshot.session.state === "active") {
      this.options.sessionService.endActiveSession(sessionId, "manual_end", now);
    }
  }

  private isRetryableWorkerAttemptError(error: unknown): boolean {
    if (!(error instanceof RemoteRelayServiceError)) {
      return false;
    }

    return new Set([
      "dialog_activation_timeout",
      "chat_bootstrap_failed",
      "chat_bootstrap_timeout",
      "relay_failed",
      "relay_timeout",
      "assistant_reply_missing",
      "remote_relay_worker_missing"
    ]).has(error.code);
  }

  private async waitForActiveSession(
    sessionId: string,
    deadlineMs: number
  ): Promise<SessionSnapshot> {
    while (Date.now() <= deadlineMs) {
      const snapshot = this.options.sessionService.getSessionSnapshot(sessionId);

      if (!snapshot) {
        throw new RemoteRelayServiceError(
          404,
          "dialog_not_found",
          `Dialog ${sessionId} was not found`
        );
      }

      if (snapshot.session.state === "active" && snapshot.session.workerId) {
        return snapshot;
      }

      if (snapshot.session.state !== "queued") {
        throw new RemoteRelayServiceError(
          409,
          "dialog_not_active",
          `Dialog ${sessionId} is ${snapshot.session.state}`
        );
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new RemoteRelayServiceError(
      504,
      "dialog_activation_timeout",
      `Dialog ${sessionId} did not become active before timeout`
    );
  }

  private async tryDirectWorkerFallback(
    sessionId: string,
    requestedForLabel: string,
    now: Date
  ): Promise<string> {
    const fallbackWorkerId = await this.options.findFallbackWorkerId?.();

    if (!fallbackWorkerId) {
      return sessionId;
    }

    this.options.sessionService.cancelQueuedSession(sessionId, now);
    const pinned = this.options.sessionService.createPinnedSession(
      fallbackWorkerId,
      requestedForLabel,
      now
    );

    return pinned.session.sessionId;
  }

  private async waitForReadyBootstrap(
    sessionId: string,
    deadlineMs: number
  ): Promise<SessionSnapshot> {
    while (Date.now() <= deadlineMs) {
      const snapshot = this.options.sessionService.getSessionSnapshot(sessionId);

      if (!snapshot) {
        throw new RemoteRelayServiceError(
          404,
          "dialog_not_found",
          `Dialog ${sessionId} was not found`
        );
      }

      const bootstrap = snapshot.chatBootstrap;

      if (bootstrap?.status === "ready") {
        return snapshot;
      }

      if (bootstrap?.status === "failed") {
        throw new RemoteRelayServiceError(
          409,
          "chat_bootstrap_failed",
          bootstrap.failureCode
            ? `Fresh chat bootstrap failed: ${bootstrap.failureCode}`
            : "Fresh chat bootstrap failed"
        );
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new RemoteRelayServiceError(
      504,
      "chat_bootstrap_timeout",
      `Dialog ${sessionId} did not reach ready bootstrap state before timeout`
    );
  }

  private async waitForRelayResult(
    sessionId: string,
    deadlineMs: number
  ): Promise<ConversationSnapshot> {
    while (Date.now() <= deadlineMs) {
      const snapshot = this.options.chatRelayService.getConversationSnapshot(sessionId);

      if (!snapshot) {
        throw new RemoteRelayServiceError(
          404,
          "dialog_not_found",
          `Dialog ${sessionId} was not found`
        );
      }

      if (snapshot.relay.status === "failed") {
        throw new RemoteRelayServiceError(
          502,
          "relay_failed",
          snapshot.relay.lastFailureCode
            ? `Relay failed: ${snapshot.relay.lastFailureCode}`
            : "Relay failed"
        );
      }

      if (
        snapshot.relay.status === "completed" &&
        snapshot.pendingAssistantMessageId === null
      ) {
        return snapshot;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new RemoteRelayServiceError(
      504,
      "relay_timeout",
      `Dialog ${sessionId} did not complete relay before timeout`
    );
  }

  private extractLatestAssistantReply(snapshot: ConversationSnapshot): string {
    const assistantMessage = [...snapshot.messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.state === "complete");

    if (!assistantMessage || assistantMessage.body.trim().length === 0) {
      throw new RemoteRelayServiceError(
        502,
        "assistant_reply_missing",
        "Relay completed without a captured assistant reply"
      );
    }

    return assistantMessage.body;
  }
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function createRemoteRelayService(
  options: RemoteRelayServiceOptions
): RemoteRelayService {
  return new RemoteRelayService(options);
}
