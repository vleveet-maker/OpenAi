export const SESSION_CHAT_BOOTSTRAP_STATUSES = [
  "pending",
  "ready",
  "failed"
] as const;

export type SessionChatBootstrapStatus =
  (typeof SESSION_CHAT_BOOTSTRAP_STATUSES)[number];

export const SESSION_CHAT_MODES = [
  "temporary",
  "standard",
  "unknown"
] as const;

export type SessionChatMode = (typeof SESSION_CHAT_MODES)[number];

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

export interface ChatBootstrapRequest {
  workerId: string;
  sessionId: string;
}

export interface ChatBootstrapResult {
  status: SessionChatBootstrapStatus;
  conversationMode: SessionChatMode;
  modelLabel: string | null;
  failureCode: string | null;
}

export interface ChatBootstrapTransport {
  bootstrap(
    request: ChatBootstrapRequest
  ): Promise<ChatBootstrapResult | void>;
}
