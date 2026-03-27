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

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageState = "pending" | "complete" | "failed";

export interface SessionMessageRecord {
  messageId: string;
  sessionId: string;
  workerId: string | null;
  role: ChatMessageRole;
  state: ChatMessageState;
  body: string;
  replyToMessageId: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface SessionConversationSnapshot {
  sessionId: string;
  worker: WorkerSummary | null;
  canSend: boolean;
  pendingAssistantMessageId: string | null;
  messages: SessionMessageRecord[];
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

export function formatFailedAssistantMessage(
  failureCode: string | null
): string {
  if (!failureCode) {
    return "The assistant reply could not be delivered";
  }

  return `Reply failed: ${failureCode.replaceAll("_", " ")}`;
}
