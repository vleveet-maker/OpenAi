export type SessionState = "queued" | "active" | "ended" | "expired" | "cancelled";
export type SessionEndReason =
  | "manual_end"
  | "timer_expired"
  | "cancelled"
  | "worker_unavailable";

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

export interface WorkerSummary {
  workerId: string;
  displayName: string;
  status: "starting" | "ready" | "busy" | "disconnected" | "reauth_required";
}

export interface SessionSnapshot {
  session: SessionRecord;
  queuePosition: number | null;
  worker: WorkerSummary | null;
}

export function formatSessionEndReason(reason: SessionEndReason | null): string {
  switch (reason) {
    case "manual_end":
      return "Session ended manually";
    case "timer_expired":
      return "The 60-minute timer has finished";
    case "cancelled":
      return "The queued session was cancelled";
    case "worker_unavailable":
      return "The assigned worker became unavailable";
    default:
      return "Session state updated";
  }
}
