import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import type { WorkerRegistry } from "../workers/worker-registry.js";

export const OPERATOR_EVENT_TYPES = [
  "worker_status_changed",
  "worker_restart_requested",
  "worker_restart_failed",
  "worker_reauth_started",
  "worker_reauth_completed",
  "relay_retry_scheduled",
  "relay_terminal_failure",
  "session_ended_with_failure"
] as const;

export type OperatorEventType = (typeof OPERATOR_EVENT_TYPES)[number];

export const OPERATOR_EVENT_SEVERITIES = [
  "info",
  "warn",
  "error"
] as const;

export type OperatorEventSeverity = (typeof OPERATOR_EVENT_SEVERITIES)[number];

export interface OperatorEventRecord {
  eventId: string;
  eventType: OperatorEventType;
  severity: OperatorEventSeverity;
  workerId: string | null;
  sessionId: string | null;
  summary: string;
  detailJson: string | null;
  occurredAt: string;
}

interface OperatorEventRow {
  event_id: string;
  event_type: OperatorEventType;
  severity: OperatorEventSeverity;
  worker_id: string | null;
  session_id: string | null;
  summary: string;
  detail_json: string | null;
  occurred_at: string;
}

export interface RecordOperatorEventInput {
  eventType: OperatorEventType;
  severity: OperatorEventSeverity;
  workerId?: string | null;
  sessionId?: string | null;
  summary: string;
  detailJson?: string | null;
  occurredAt?: string;
}

export interface OperatorObservabilitySummary {
  checkedAt: string;
  totalEvents: number;
  totalWorkers: number;
  workerStatusCounts: Record<string, number>;
  severityCounts: Record<OperatorEventSeverity, number>;
  recentFailures: OperatorEventRecord[];
  recentRestarts: OperatorEventRecord[];
  lastEventAt: string | null;
}

export interface OperatorEventRecorder {
  recordEvent(input: RecordOperatorEventInput): OperatorEventRecord;
}

function toOperatorEventRecord(row: OperatorEventRow): OperatorEventRecord {
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    severity: row.severity,
    workerId: row.worker_id,
    sessionId: row.session_id,
    summary: row.summary,
    detailJson: row.detail_json,
    occurredAt: row.occurred_at
  };
}

function withSeverityDefaults(
  counts: Partial<Record<OperatorEventSeverity, number>>
): Record<OperatorEventSeverity, number> {
  return {
    info: counts.info ?? 0,
    warn: counts.warn ?? 0,
    error: counts.error ?? 0
  };
}

export function clampOperatorEventLimit(
  value: unknown,
  fallback = 50
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(200, Math.max(1, parsed));
}

export function summarizeWorkerStatusCounts(
  workerRegistry: WorkerRegistry
): {
  totalWorkers: number;
  workerStatusCounts: Record<string, number>;
  degraded: boolean;
} {
  const workers = workerRegistry.listWorkers();
  const workerStatusCounts = workers.reduce<Record<string, number>>(
    (accumulator, worker) => {
      const current = accumulator[worker.status.status] ?? 0;
      accumulator[worker.status.status] = current + 1;
      return accumulator;
    },
    {}
  );
  const degraded = workers.some((worker) =>
    ["disconnected", "reauth_required", "starting"].includes(worker.status.status)
  );

  return {
    totalWorkers: workers.length,
    workerStatusCounts,
    degraded
  };
}

export class OperatorEventStore {
  private readonly database: Database.Database;

  constructor(private readonly databasePath: string) {
    mkdirSync(dirname(databasePath), {
      recursive: true
    });

    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS operator_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL CHECK (event_type IN (${OPERATOR_EVENT_TYPES.map((eventType) => `'${eventType}'`).join(", ")})),
        severity TEXT NOT NULL CHECK (severity IN (${OPERATOR_EVENT_SEVERITIES.map((severity) => `'${severity}'`).join(", ")})),
        worker_id TEXT,
        session_id TEXT,
        summary TEXT NOT NULL,
        detail_json TEXT,
        occurred_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_operator_events_occurred_at
      ON operator_events (occurred_at DESC, event_id DESC);

      CREATE INDEX IF NOT EXISTS idx_operator_events_type
      ON operator_events (event_type, occurred_at DESC, event_id DESC);

      CREATE INDEX IF NOT EXISTS idx_operator_events_severity
      ON operator_events (severity, occurred_at DESC, event_id DESC);
    `);
  }

  close(): void {
    this.database.close();
  }

  recordEvent(input: RecordOperatorEventInput): OperatorEventRecord {
    const record: OperatorEventRecord = {
      eventId: randomUUID(),
      eventType: input.eventType,
      severity: input.severity,
      workerId: input.workerId ?? null,
      sessionId: input.sessionId ?? null,
      summary: input.summary,
      detailJson: input.detailJson ?? null,
      occurredAt: input.occurredAt ?? new Date().toISOString()
    };

    this.database
      .prepare(
        `
        INSERT INTO operator_events (
          event_id,
          event_type,
          severity,
          worker_id,
          session_id,
          summary,
          detail_json,
          occurred_at
        ) VALUES (
          @event_id,
          @event_type,
          @severity,
          @worker_id,
          @session_id,
          @summary,
          @detail_json,
          @occurred_at
        )
      `
      )
      .run({
        event_id: record.eventId,
        event_type: record.eventType,
        severity: record.severity,
        worker_id: record.workerId,
        session_id: record.sessionId,
        summary: record.summary,
        detail_json: record.detailJson,
        occurred_at: record.occurredAt
      });

    return record;
  }

  listRecentEvents(limit = 50): OperatorEventRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM operator_events
        ORDER BY occurred_at DESC, event_id DESC
        LIMIT ?
      `
      )
      .all(clampOperatorEventLimit(limit)) as OperatorEventRow[];

    return rows.map(toOperatorEventRecord);
  }

  listRecentFailures(limit = 10): OperatorEventRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM operator_events
        WHERE event_type IN (
          'worker_restart_failed',
          'relay_terminal_failure',
          'session_ended_with_failure'
        )
          OR (event_type = 'worker_status_changed' AND severity = 'error')
        ORDER BY occurred_at DESC, event_id DESC
        LIMIT ?
      `
      )
      .all(clampOperatorEventLimit(limit, 10)) as OperatorEventRow[];

    return rows.map(toOperatorEventRecord);
  }

  listRecentRestarts(limit = 10): OperatorEventRecord[] {
    const rows = this.database
      .prepare(
        `
        SELECT *
        FROM operator_events
        WHERE event_type IN (
          'worker_restart_requested',
          'worker_restart_failed'
        )
        ORDER BY occurred_at DESC, event_id DESC
        LIMIT ?
      `
      )
      .all(clampOperatorEventLimit(limit, 10)) as OperatorEventRow[];

    return rows.map(toOperatorEventRecord);
  }

  getLastEventAt(): string | null {
    const row = this.database
      .prepare(
        `
        SELECT occurred_at
        FROM operator_events
        ORDER BY occurred_at DESC, event_id DESC
        LIMIT 1
      `
      )
      .get() as { occurred_at: string } | undefined;

    return row?.occurred_at ?? null;
  }

  getTotalEventCount(): number {
    const row = this.database
      .prepare(
        `
        SELECT COUNT(*) AS total_events
        FROM operator_events
      `
      )
      .get() as { total_events: number };

    return row.total_events;
  }

  getSeverityCounts(): Record<OperatorEventSeverity, number> {
    const rows = this.database
      .prepare(
        `
        SELECT severity, COUNT(*) AS severity_count
        FROM operator_events
        GROUP BY severity
      `
      )
      .all() as Array<{
        severity: OperatorEventSeverity;
        severity_count: number;
      }>;

    return withSeverityDefaults(
      Object.fromEntries(
        rows.map((row) => [row.severity, row.severity_count])
      ) as Partial<Record<OperatorEventSeverity, number>>
    );
  }
}

export class OperatorObservabilityService implements OperatorEventRecorder {
  constructor(
    private readonly store: OperatorEventStore,
    private readonly workerRegistry: WorkerRegistry
  ) {}

  recordEvent(input: RecordOperatorEventInput): OperatorEventRecord {
    return this.store.recordEvent(input);
  }

  listRecentEvents(limit = 50): OperatorEventRecord[] {
    return this.store.listRecentEvents(limit);
  }

  getSummary(now: Date = new Date()): OperatorObservabilitySummary {
    const workerSummary = summarizeWorkerStatusCounts(this.workerRegistry);

    return {
      checkedAt: now.toISOString(),
      totalEvents: this.store.getTotalEventCount(),
      totalWorkers: workerSummary.totalWorkers,
      workerStatusCounts: workerSummary.workerStatusCounts,
      severityCounts: this.store.getSeverityCounts(),
      recentFailures: this.store.listRecentFailures(10),
      recentRestarts: this.store.listRecentRestarts(10),
      lastEventAt: this.store.getLastEventAt()
    };
  }
}

export function createOperatorObservabilityService(options: {
  store: OperatorEventStore;
  workerRegistry: WorkerRegistry;
}): OperatorObservabilityService {
  return new OperatorObservabilityService(options.store, options.workerRegistry);
}
