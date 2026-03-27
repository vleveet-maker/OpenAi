import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import {
  type SessionRecord,
  type SessionState,
  SESSION_END_REASONS,
  SESSION_STATES
} from "./session-types.js";

interface SessionRow {
  session_id: string;
  requested_for_label: string;
  state: SessionState;
  worker_id: string | null;
  queued_at: string;
  started_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  end_reason: SessionRecord["endReason"];
}

function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    sessionId: row.session_id,
    requestedForLabel: row.requested_for_label,
    state: row.state,
    workerId: row.worker_id,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    endedAt: row.ended_at,
    endReason: row.end_reason
  };
}

export class SessionStore {
  private readonly database: Database.Database;

  constructor(private readonly databasePath: string) {
    mkdirSync(dirname(databasePath), {
      recursive: true
    });

    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        requested_for_label TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN (${SESSION_STATES.map((state) => `'${state}'`).join(", ")})),
        worker_id TEXT,
        queued_at TEXT NOT NULL,
        started_at TEXT,
        ends_at TEXT,
        ended_at TEXT,
        end_reason TEXT CHECK (end_reason IS NULL OR end_reason IN (${SESSION_END_REASONS.map((reason) => `'${reason}'`).join(", ")}))
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_state_queued
      ON sessions (state, queued_at, session_id);

      CREATE INDEX IF NOT EXISTS idx_sessions_worker_active
      ON sessions (worker_id, state);

      CREATE INDEX IF NOT EXISTS idx_sessions_started_at
      ON sessions (worker_id, started_at);
    `);
  }

  close(): void {
    this.database.close();
  }

  insertSession(session: SessionRecord): void {
    this.database
      .prepare(
        `
        INSERT INTO sessions (
          session_id,
          requested_for_label,
          state,
          worker_id,
          queued_at,
          started_at,
          ends_at,
          ended_at,
          end_reason
        ) VALUES (
          @session_id,
          @requested_for_label,
          @state,
          @worker_id,
          @queued_at,
          @started_at,
          @ends_at,
          @ended_at,
          @end_reason
        )
      `
      )
      .run({
        session_id: session.sessionId,
        requested_for_label: session.requestedForLabel,
        state: session.state,
        worker_id: session.workerId,
        queued_at: session.queuedAt,
        started_at: session.startedAt,
        ends_at: session.endsAt,
        ended_at: session.endedAt,
        end_reason: session.endReason
      });
  }

  updateSession(session: SessionRecord): void {
    this.database
      .prepare(
        `
        UPDATE sessions
        SET requested_for_label = @requested_for_label,
            state = @state,
            worker_id = @worker_id,
            queued_at = @queued_at,
            started_at = @started_at,
            ends_at = @ends_at,
            ended_at = @ended_at,
            end_reason = @end_reason
        WHERE session_id = @session_id
      `
      )
      .run({
        session_id: session.sessionId,
        requested_for_label: session.requestedForLabel,
        state: session.state,
        worker_id: session.workerId,
        queued_at: session.queuedAt,
        started_at: session.startedAt,
        ends_at: session.endsAt,
        ended_at: session.endedAt,
        end_reason: session.endReason
      });
  }

  getSession(sessionId: string): SessionRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM sessions
        WHERE session_id = ?
      `
      )
      .get(sessionId) as SessionRow | undefined;

    return row ? toSessionRecord(row) : undefined;
  }

  getNonTerminalSessions(): SessionRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM sessions
        WHERE state IN ('queued', 'active')
        ORDER BY queued_at ASC, session_id ASC
      `
      )
      .all() as SessionRow[];

    return rows.map(toSessionRecord);
  }

  getNextQueuedSession(): SessionRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM sessions
        WHERE state = 'queued'
        ORDER BY queued_at ASC, session_id ASC
        LIMIT 1
      `
      )
      .get() as SessionRow | undefined;

    return row ? toSessionRecord(row) : undefined;
  }

  getActiveSessions(): SessionRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM sessions
        WHERE state = 'active'
        ORDER BY started_at ASC, session_id ASC
      `
      )
      .all() as SessionRow[];

    return rows.map(toSessionRecord);
  }

  getActiveSessionByWorker(workerId: string): SessionRecord | undefined {
    const row = this.database
      .prepare(
        `
        SELECT *
        FROM sessions
        WHERE worker_id = ? AND state = 'active'
        ORDER BY started_at DESC, session_id DESC
        LIMIT 1
      `
      )
      .get(workerId) as SessionRow | undefined;

    return row ? toSessionRecord(row) : undefined;
  }

  getQueuePosition(sessionId: string): number | null {
    const session = this.getSession(sessionId);

    if (!session || session.state !== "queued") {
      return null;
    }

    const row = this.database
      .prepare(
        `
        SELECT COUNT(*) AS queue_position
        FROM sessions
        WHERE state = 'queued'
          AND (
            queued_at < @queued_at
            OR (queued_at = @queued_at AND session_id <= @session_id)
          )
      `
      )
      .get({
        queued_at: session.queuedAt,
        session_id: session.sessionId
      }) as { queue_position: number };

    return row.queue_position;
  }

  getLastAssignedAtByWorker(): Record<string, string> {
    const rows = this.database
      .prepare(
        `
        SELECT worker_id, MAX(started_at) AS last_assigned_at
        FROM sessions
        WHERE worker_id IS NOT NULL
          AND started_at IS NOT NULL
        GROUP BY worker_id
      `
      )
      .all() as Array<{
        worker_id: string;
        last_assigned_at: string;
      }>;

    return Object.fromEntries(
      rows.map((row) => [row.worker_id, row.last_assigned_at])
    );
  }
}
