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
  chatBootstrap: SessionChatBootstrapRecord | null;
}

export type SessionChatBootstrapStatus = "pending" | "ready" | "failed";
export type SessionChatMode = "temporary" | "standard" | "unknown";

export interface SessionChatBootstrapRecord {
  sessionId: string;
  workerId: string;
  status: SessionChatBootstrapStatus;
  conversationMode: SessionChatMode;
  modelLabel: string | null;
  failureCode: string | null;
  requestedAt: string;
  completedAt: string | null;
  updatedAt: string;
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

export interface RelayStatusSnapshot {
  status: "idle" | "dispatching" | "retrying" | "failed" | "completed";
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastFailureCode: string | null;
  lastFailureClass: "transient" | "auth" | "fatal" | null;
}

export interface SessionConversationSnapshot {
  sessionId: string;
  worker: WorkerSummary | null;
  canSend: boolean;
  pendingAssistantMessageId: string | null;
  relay: RelayStatusSnapshot;
  chatBootstrap: SessionChatBootstrapRecord | null;
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

export function formatChatMode(mode: SessionChatMode | null | undefined): string {
  switch (mode) {
    case "temporary":
      return "Temporary Chat";
    case "standard":
      return "Standard Chat";
    default:
      return "Preparing";
  }
}

export function formatChatBootstrapFailure(
  failureCode: string | null
): string {
  if (!failureCode) {
    return "Fresh chat setup could not be completed";
  }

  switch (failureCode) {
    case "bootstrap_auth_required":
      return "ChatGPT needs manual login or reauthentication before a fresh chat can start";
    case "temporary_chat_unavailable":
      return "Temporary Chat could not be enabled on the assigned worker";
    case "model_not_available":
      return "The preferred reasoning model is not available on the assigned worker";
    default:
      return `Fresh chat setup failed: ${failureCode.replaceAll("_", " ")}`;
  }
}
