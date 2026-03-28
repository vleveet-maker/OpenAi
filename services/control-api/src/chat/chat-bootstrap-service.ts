import type { OperatorEventRecorder } from "../observability/operator-events.js";
import type { SessionSnapshot } from "../sessions/session-types.js";
import type { SessionService } from "../sessions/session-service.js";
import {
  type ChatBootstrapTransport,
  type SessionChatBootstrapRecord
} from "./chat-bootstrap-types.js";
import { ChatBootstrapStore } from "./chat-bootstrap-store.js";

export interface ChatBootstrapServiceOptions {
  store: ChatBootstrapStore;
  sessionService: SessionService;
  transport: ChatBootstrapTransport;
  eventRecorder?: OperatorEventRecorder;
}

export class ChatBootstrapService {
  private readonly activeBootstraps = new Set<string>();

  constructor(private readonly options: ChatBootstrapServiceOptions) {}

  getBootstrap(
    sessionId: string
  ): SessionChatBootstrapRecord | null {
    return this.options.store.getBootstrap(sessionId) ?? null;
  }

  scheduleBootstrapForActiveSessions(now: Date = new Date()): void {
    for (const snapshot of this.options.sessionService.listActiveSessionSnapshots()) {
      const existing = this.getBootstrap(snapshot.session.sessionId);

      if (existing?.status === "ready") {
        continue;
      }

      this.scheduleBootstrapForSession(snapshot, now);
    }
  }

  scheduleBootstrapForSession(
    snapshot: SessionSnapshot,
    now: Date = new Date()
  ): SessionChatBootstrapRecord | null {
    if (
      snapshot.session.state !== "active" ||
      !snapshot.session.workerId
    ) {
      return null;
    }

    const nowIso = now.toISOString();
    const existing = this.getBootstrap(snapshot.session.sessionId);
    const pendingRecord: SessionChatBootstrapRecord = {
      sessionId: snapshot.session.sessionId,
      workerId: snapshot.session.workerId,
      status: "pending",
      conversationMode: "unknown",
      modelLabel: null,
      failureCode: null,
      requestedAt: nowIso,
      completedAt: null,
      updatedAt: nowIso
    };

    this.options.store.upsertBootstrap(pendingRecord);
    void this.dispatchBootstrap(pendingRecord);

    return pendingRecord;
  }

  private async dispatchBootstrap(
    record: SessionChatBootstrapRecord
  ): Promise<void> {
    if (this.activeBootstraps.has(record.sessionId)) {
      return;
    }

    this.activeBootstraps.add(record.sessionId);

    try {
      const result = await this.options.transport.bootstrap({
        workerId: record.workerId,
        sessionId: record.sessionId
      });

      if (!result) {
        this.markFailed(record, "chat_bootstrap_result_missing");
        return;
      }

      const completedAt = new Date().toISOString();

      if (result.status === "ready") {
        this.options.store.upsertBootstrap({
          ...record,
          status: "ready",
          conversationMode: result.conversationMode,
          modelLabel: result.modelLabel,
          failureCode: null,
          completedAt,
          updatedAt: completedAt
        });
        return;
      }

      this.markFailed(record, result.failureCode ?? "chat_bootstrap_failed");
    } catch (error: unknown) {
      this.markFailed(record, this.resolveFailureCode(error));
    } finally {
      this.activeBootstraps.delete(record.sessionId);
    }
  }

  private markFailed(
    record: SessionChatBootstrapRecord,
    failureCode: string
  ): void {
    const failedAt = new Date().toISOString();

    this.options.store.upsertBootstrap({
      ...record,
      status: "failed",
      conversationMode: "unknown",
      modelLabel: null,
      failureCode,
      completedAt: failedAt,
      updatedAt: failedAt
    });

    this.options.eventRecorder?.recordEvent({
      eventType: "relay_terminal_failure",
      severity: "warn",
      workerId: record.workerId,
      sessionId: record.sessionId,
      summary: `Chat bootstrap failed for session ${record.sessionId}`,
      detailJson: JSON.stringify({
        phase: "chat_bootstrap",
        failureCode
      }),
      occurredAt: failedAt
    });
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

    return "chat_bootstrap_dispatch_failed";
  }
}

export function createChatBootstrapService(
  options: ChatBootstrapServiceOptions
): ChatBootstrapService {
  return new ChatBootstrapService(options);
}
