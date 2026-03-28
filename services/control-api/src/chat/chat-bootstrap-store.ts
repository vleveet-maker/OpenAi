import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import {
  SESSION_CHAT_BOOTSTRAP_STATUSES,
  SESSION_CHAT_MODES,
  type SessionChatBootstrapRecord
} from "./chat-bootstrap-types.js";

interface SessionChatBootstrapRow {
  session_id: string;
  worker_id: string;
  status: SessionChatBootstrapRecord["status"];
  conversation_mode: SessionChatBootstrapRecord["conversationMode"];
  model_label: string | null;
  failure_code: string | null;
  requested_at: string;
  completed_at: string | null;
  updated_at: string;
}

function toSessionChatBootstrapRecord(
  row: SessionChatBootstrapRow
): SessionChatBootstrapRecord {
  return {
    sessionId: row.session_id,
    workerId: row.worker_id,
    status: row.status,
    conversationMode: row.conversation_mode,
    modelLabel: row.model_label,
    failureCode: row.failure_code,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at
  };
}

export class ChatBootstrapStore {
  private readonly database: Database.Database;

  constructor(private readonly databasePath: string) {
    mkdirSync(dirname(databasePath), {
      recursive: true
    });

    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS session_chat_bootstraps (
        session_id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN (${SESSION_CHAT_BOOTSTRAP_STATUSES.map((status) => `'${status}'`).join(", ")})),
        conversation_mode TEXT NOT NULL CHECK (conversation_mode IN (${SESSION_CHAT_MODES.map((mode) => `'${mode}'`).join(", ")})),
        model_label TEXT,
        failure_code TEXT,
        requested_at TEXT NOT NULL,
        completed_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_chat_bootstraps_status_updated
      ON session_chat_bootstraps (status, updated_at, session_id);
    `);
  }

  close(): void {
    this.database.close();
  }

  getBootstrap(
    sessionId: string
  ): SessionChatBootstrapRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM session_chat_bootstraps
        WHERE session_id = ?
      `
      )
      .get(sessionId) as SessionChatBootstrapRow | undefined;

    return row ? toSessionChatBootstrapRecord(row) : undefined;
  }

  upsertBootstrap(record: SessionChatBootstrapRecord): void {
    this.database
      .prepare(
        `
        INSERT INTO session_chat_bootstraps (
          session_id,
          worker_id,
          status,
          conversation_mode,
          model_label,
          failure_code,
          requested_at,
          completed_at,
          updated_at
        ) VALUES (
          @session_id,
          @worker_id,
          @status,
          @conversation_mode,
          @model_label,
          @failure_code,
          @requested_at,
          @completed_at,
          @updated_at
        )
        ON CONFLICT(session_id) DO UPDATE SET
          worker_id = excluded.worker_id,
          status = excluded.status,
          conversation_mode = excluded.conversation_mode,
          model_label = excluded.model_label,
          failure_code = excluded.failure_code,
          requested_at = excluded.requested_at,
          completed_at = excluded.completed_at,
          updated_at = excluded.updated_at
      `
      )
      .run({
        session_id: record.sessionId,
        worker_id: record.workerId,
        status: record.status,
        conversation_mode: record.conversationMode,
        model_label: record.modelLabel,
        failure_code: record.failureCode,
        requested_at: record.requestedAt,
        completed_at: record.completedAt,
        updated_at: record.updatedAt
      });
  }
}
