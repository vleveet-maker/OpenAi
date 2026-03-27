import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import {
  CHAT_MESSAGE_ROLES,
  CHAT_MESSAGE_STATES,
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
}
