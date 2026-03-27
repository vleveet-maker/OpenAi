import type { WorkerStatus } from "../workers/worker-status.js";

export const SESSION_STATES = [
  "queued",
  "active",
  "ended",
  "expired",
  "cancelled"
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

export const SESSION_END_REASONS = [
  "manual_end",
  "timer_expired",
  "cancelled",
  "worker_unavailable"
] as const;

export type SessionEndReason = (typeof SESSION_END_REASONS)[number];

export interface SessionRecord {
  sessionId: string;
  requestedForLabel: string;
  state: SessionState;
  workerId: string | null;
  queuedAt: string;
  startedAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  endReason: SessionEndReason | null;
}

export interface PublicWorkerSummary {
  workerId: string;
  displayName: string;
  status: WorkerStatus;
}

export interface SessionSnapshot {
  session: SessionRecord;
  queuePosition: number | null;
  worker: PublicWorkerSummary | null;
}

export function getSessionStateForEndReason(
  reason: SessionEndReason
): SessionState {
  if (reason === "timer_expired") {
    return "expired";
  }

  if (reason === "cancelled") {
    return "cancelled";
  }

  return "ended";
}
