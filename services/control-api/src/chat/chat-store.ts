import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import {
  CHAT_MESSAGE_ROLES,
  CHAT_MESSAGE_STATES,
  RELAY_ATTEMPT_STAGES,
  RELAY_FAILURE_CLASSES,
  RELAY_JOB_STATES,
  type RelayJobRecord,
  type RelayStatusSnapshot,
  type SessionMessageRecord
} from "./chat-types.js";

interface SessionMessageRow {
  message_id: string;
  session_id: string;
  worker_id: string | null;
  role: SessionMessageRecord["role"];
  state: SessionMessageRecord["state"];
  body: string;
  reply_to_message_id: string | null;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface RelayJobRow {
  assistant_message_id: string;
  session_id: string;
  worker_id: string;
  user_message_id: string;
  state: RelayJobRecord["state"];
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  last_failure_code: string | null;
  last_failure_class: RelayJobRecord["lastFailureClass"];
  last_failure_stage: RelayJobRecord["lastFailureStage"];
}

function toSessionMessageRecord(row: SessionMessageRow): SessionMessageRecord {
  return {
    messageId: row.message_id,
    sessionId: row.session_id,
    workerId: row.worker_id,
    role: row.role,
    state: row.state,
    body: row.body,
    replyToMessageId: row.reply_to_message_id,
    failureCode: row.failure_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

function toRelayJobRecord(row: RelayJobRow): RelayJobRecord {
  return {
    assistantMessageId: row.assistant_message_id,
    sessionId: row.session_id,
    workerId: row.worker_id,
    userMessageId: row.user_message_id,
    state: row.state,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    nextRetryAt: row.next_retry_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    lastFailureCode: row.last_failure_code,
    lastFailureClass: row.last_failure_class,
    lastFailureStage: row.last_failure_stage
  };
}

function toRelayStatusSnapshot(
  job: RelayJobRecord | undefined
): RelayStatusSnapshot {
  if (!job) {
    return {
      status: "idle",
      attemptCount: 0,
      maxAttempts: 0,
      nextRetryAt: null,
      lastFailureCode: null,
      lastFailureClass: null
    };
  }

  if (job.state === "failed") {
    return {
      status: "failed",
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextRetryAt: job.nextRetryAt,
      lastFailureCode: job.lastFailureCode,
      lastFailureClass: job.lastFailureClass
    };
  }

  if (job.state === "completed") {
    return {
      status: "completed",
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextRetryAt: job.nextRetryAt,
      lastFailureCode: job.lastFailureCode,
      lastFailureClass: job.lastFailureClass
    };
  }

  return {
    status:
      job.state === "retry_wait" || job.attemptCount > 1
        ? "retrying"
        : "dispatching",
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    nextRetryAt: job.nextRetryAt,
    lastFailureCode: job.lastFailureCode,
    lastFailureClass: job.lastFailureClass
  };
}

export class ChatStore {
  private readonly database: Database.Database;

  constructor(private readonly databasePath: string) {
    mkdirSync(dirname(databasePath), {
      recursive: true
    });

    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS session_messages (
        message_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        worker_id TEXT,
        role TEXT NOT NULL CHECK (role IN (${CHAT_MESSAGE_ROLES.map((role) => `'${role}'`).join(", ")})),
        state TEXT NOT NULL CHECK (state IN (${CHAT_MESSAGE_STATES.map((state) => `'${state}'`).join(", ")})),
        body TEXT NOT NULL,
        reply_to_message_id TEXT,
        failure_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_session_messages_session_created
      ON session_messages (session_id, created_at, message_id);

      CREATE INDEX IF NOT EXISTS idx_session_messages_session_state_role
      ON session_messages (session_id, state, role);

      CREATE TABLE IF NOT EXISTS relay_jobs (
        assistant_message_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        user_message_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN (${RELAY_JOB_STATES.map((state) => `'${state}'`).join(", ")})),
        attempt_count INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        next_retry_at TEXT,
        submitted_at TEXT,
        completed_at TEXT,
        last_failure_code TEXT,
        last_failure_class TEXT CHECK (last_failure_class IS NULL OR last_failure_class IN (${RELAY_FAILURE_CLASSES.map((failureClass) => `'${failureClass}'`).join(", ")})),
        last_failure_stage TEXT CHECK (last_failure_stage IS NULL OR last_failure_stage IN (${RELAY_ATTEMPT_STAGES.map((stage) => `'${stage}'`).join(", ")}))
      );

      CREATE INDEX IF NOT EXISTS idx_relay_jobs_session
      ON relay_jobs (session_id, assistant_message_id);

      CREATE INDEX IF NOT EXISTS idx_relay_jobs_retry
      ON relay_jobs (state, next_retry_at, assistant_message_id);
    `);
  }

  close(): void {
    this.database.close();
  }

  insertMessage(message: SessionMessageRecord): void {
    this.database
      .prepare(
        `
        INSERT INTO session_messages (
          message_id,
          session_id,
          worker_id,
          role,
          state,
          body,
          reply_to_message_id,
          failure_code,
          created_at,
          updated_at,
          completed_at
        ) VALUES (
          @message_id,
          @session_id,
          @worker_id,
          @role,
          @state,
          @body,
          @reply_to_message_id,
          @failure_code,
          @created_at,
          @updated_at,
          @completed_at
        )
      `
      )
      .run({
        message_id: message.messageId,
        session_id: message.sessionId,
        worker_id: message.workerId,
        role: message.role,
        state: message.state,
        body: message.body,
        reply_to_message_id: message.replyToMessageId,
        failure_code: message.failureCode,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
        completed_at: message.completedAt
      });
  }

  insertRelayJob(job: RelayJobRecord): void {
    this.database
      .prepare(
        `
        INSERT INTO relay_jobs (
          assistant_message_id,
          session_id,
          worker_id,
          user_message_id,
          state,
          attempt_count,
          max_attempts,
          next_retry_at,
          submitted_at,
          completed_at,
          last_failure_code,
          last_failure_class,
          last_failure_stage
        ) VALUES (
          @assistant_message_id,
          @session_id,
          @worker_id,
          @user_message_id,
          @state,
          @attempt_count,
          @max_attempts,
          @next_retry_at,
          @submitted_at,
          @completed_at,
          @last_failure_code,
          @last_failure_class,
          @last_failure_stage
        )
      `
      )
      .run({
        assistant_message_id: job.assistantMessageId,
        session_id: job.sessionId,
        worker_id: job.workerId,
        user_message_id: job.userMessageId,
        state: job.state,
        attempt_count: job.attemptCount,
        max_attempts: job.maxAttempts,
        next_retry_at: job.nextRetryAt,
        submitted_at: job.submittedAt,
        completed_at: job.completedAt,
        last_failure_code: job.lastFailureCode,
        last_failure_class: job.lastFailureClass,
        last_failure_stage: job.lastFailureStage
      });
  }

  getMessage(messageId: string): SessionMessageRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM session_messages
        WHERE message_id = ?
      `
      )
      .get(messageId) as SessionMessageRow | undefined;

    return row ? toSessionMessageRecord(row) : undefined;
  }

  getRelayJob(assistantMessageId: string): RelayJobRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM relay_jobs
        WHERE assistant_message_id = ?
      `
      )
      .get(assistantMessageId) as RelayJobRow | undefined;

    return row ? toRelayJobRecord(row) : undefined;
  }

  listMessagesForSession(sessionId: string): SessionMessageRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM session_messages
        WHERE session_id = ?
        ORDER BY created_at ASC, message_id ASC
      `
      )
      .all(sessionId) as SessionMessageRow[];

    return rows.map(toSessionMessageRecord);
  }

  getPendingAssistantMessage(sessionId: string): SessionMessageRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM session_messages
        WHERE session_id = ?
          AND role = 'assistant'
          AND state = 'pending'
        ORDER BY created_at DESC, message_id DESC
        LIMIT 1
      `
      )
      .get(sessionId) as SessionMessageRow | undefined;

    return row ? toSessionMessageRecord(row) : undefined;
  }

  completeAssistantMessage(
    messageId: string,
    assistantText: string,
    completedAt: string
  ): SessionMessageRecord | undefined {
    const message = this.getMessage(messageId);

    if (!message) {
      return undefined;
    }

    const updatedMessage: SessionMessageRecord = {
      ...message,
      state: "complete",
      body: assistantText,
      failureCode: null,
      updatedAt: completedAt,
      completedAt
    };

    this.updateMessage(updatedMessage);
    return updatedMessage;
  }

  failAssistantMessage(
    messageId: string,
    failureCode: string,
    failedAt: string
  ): SessionMessageRecord | undefined {
    const message = this.getMessage(messageId);

    if (!message) {
      return undefined;
    }

    const updatedMessage: SessionMessageRecord = {
      ...message,
      state: "failed",
      failureCode,
      updatedAt: failedAt,
      completedAt: failedAt
    };

    this.updateMessage(updatedMessage);
    return updatedMessage;
  }

  startRelayAttempt(
    assistantMessageId: string,
    dispatchedAt: string
  ): RelayJobRecord | undefined {
    const job = this.getRelayJob(assistantMessageId);

    if (!job) {
      return undefined;
    }

    const updatedJob: RelayJobRecord = {
      ...job,
      state: "dispatching",
      attemptCount: job.attemptCount + 1,
      nextRetryAt: null,
      completedAt: null
    };

    this.updateRelayJob(updatedJob);
    this.touchMessageUpdatedAt(assistantMessageId, dispatchedAt);
    return updatedJob;
  }

  scheduleRelayRetry(
    assistantMessageId: string,
    failureCode: string,
    failureClass: RelayJobRecord["lastFailureClass"],
    failureStage: RelayJobRecord["lastFailureStage"],
    failedAt: string,
    nextRetryAt: string
  ): RelayJobRecord | undefined {
    const job = this.getRelayJob(assistantMessageId);

    if (!job) {
      return undefined;
    }

    const updatedJob: RelayJobRecord = {
      ...job,
      state: "retry_wait",
      nextRetryAt,
      completedAt: null,
      lastFailureCode: failureCode,
      lastFailureClass: failureClass,
      lastFailureStage: failureStage
    };

    this.updateRelayJob(updatedJob);
    this.touchMessageUpdatedAt(assistantMessageId, failedAt);
    return updatedJob;
  }

  completeRelayJob(
    assistantMessageId: string,
    completedAt: string,
    submittedAt: string | null
  ): RelayJobRecord | undefined {
    const job = this.getRelayJob(assistantMessageId);

    if (!job) {
      return undefined;
    }

    const updatedJob: RelayJobRecord = {
      ...job,
      state: "completed",
      nextRetryAt: null,
      submittedAt: submittedAt ?? job.submittedAt,
      completedAt
    };

    this.updateRelayJob(updatedJob);
    return updatedJob;
  }

  failRelayJob(
    assistantMessageId: string,
    failureCode: string,
    failureClass: RelayJobRecord["lastFailureClass"],
    failureStage: RelayJobRecord["lastFailureStage"],
    failedAt: string,
    submittedAt: string | null
  ): RelayJobRecord | undefined {
    const job = this.getRelayJob(assistantMessageId);

    if (!job) {
      return undefined;
    }

    const updatedJob: RelayJobRecord = {
      ...job,
      state: "failed",
      nextRetryAt: null,
      submittedAt: submittedAt ?? job.submittedAt,
      completedAt: failedAt,
      lastFailureCode: failureCode,
      lastFailureClass: failureClass,
      lastFailureStage: failureStage
    };

    this.updateRelayJob(updatedJob);
    return updatedJob;
  }

  listRetryableRelayJobs(nowIso: string): RelayJobRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM relay_jobs
        WHERE state IN ('queued', 'retry_wait')
          AND (next_retry_at IS NULL OR next_retry_at <= ?)
        ORDER BY COALESCE(next_retry_at, ''), assistant_message_id ASC
      `
      )
      .all(nowIso) as RelayJobRow[];

    return rows.map(toRelayJobRecord);
  }

  getRelayStatusForSession(sessionId: string): RelayStatusSnapshot {
    const row = this.database
      .prepare(
        `
        SELECT relay_jobs.*
        FROM relay_jobs
        INNER JOIN session_messages
          ON session_messages.message_id = relay_jobs.assistant_message_id
        WHERE relay_jobs.session_id = ?
        ORDER BY session_messages.created_at DESC, relay_jobs.assistant_message_id DESC
        LIMIT 1
      `
      )
      .get(sessionId) as RelayJobRow | undefined;

    return toRelayStatusSnapshot(row ? toRelayJobRecord(row) : undefined);
  }

  private updateMessage(message: SessionMessageRecord): void {
    this.database
      .prepare(
        `
        UPDATE session_messages
        SET session_id = @session_id,
            worker_id = @worker_id,
            role = @role,
            state = @state,
            body = @body,
            reply_to_message_id = @reply_to_message_id,
            failure_code = @failure_code,
            created_at = @created_at,
            updated_at = @updated_at,
            completed_at = @completed_at
        WHERE message_id = @message_id
      `
      )
      .run({
        message_id: message.messageId,
        session_id: message.sessionId,
        worker_id: message.workerId,
        role: message.role,
        state: message.state,
        body: message.body,
        reply_to_message_id: message.replyToMessageId,
        failure_code: message.failureCode,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
        completed_at: message.completedAt
      });
  }

  private updateRelayJob(job: RelayJobRecord): void {
    this.database
      .prepare(
        `
        UPDATE relay_jobs
        SET session_id = @session_id,
            worker_id = @worker_id,
            user_message_id = @user_message_id,
            state = @state,
            attempt_count = @attempt_count,
            max_attempts = @max_attempts,
            next_retry_at = @next_retry_at,
            submitted_at = @submitted_at,
            completed_at = @completed_at,
            last_failure_code = @last_failure_code,
            last_failure_class = @last_failure_class,
            last_failure_stage = @last_failure_stage
        WHERE assistant_message_id = @assistant_message_id
      `
      )
      .run({
        assistant_message_id: job.assistantMessageId,
        session_id: job.sessionId,
        worker_id: job.workerId,
        user_message_id: job.userMessageId,
        state: job.state,
        attempt_count: job.attemptCount,
        max_attempts: job.maxAttempts,
        next_retry_at: job.nextRetryAt,
        submitted_at: job.submittedAt,
        completed_at: job.completedAt,
        last_failure_code: job.lastFailureCode,
        last_failure_class: job.lastFailureClass,
        last_failure_stage: job.lastFailureStage
      });
  }

  private touchMessageUpdatedAt(messageId: string, updatedAt: string): void {
    this.database
      .prepare(
        `
        UPDATE session_messages
        SET updated_at = ?
        WHERE message_id = ?
      `
      )
      .run(updatedAt, messageId);
  }
}
