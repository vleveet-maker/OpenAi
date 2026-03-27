import type { PublicWorkerSummary } from "../sessions/session-types.js";

export const CHAT_MESSAGE_ROLES = [
  "user",
  "assistant"
] as const;

export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number];

export const CHAT_MESSAGE_STATES = [
  "pending",
  "complete",
  "failed"
] as const;

export type ChatMessageState = (typeof CHAT_MESSAGE_STATES)[number];

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

export interface ConversationSnapshot {
  sessionId: string;
  worker: PublicWorkerSummary | null;
  canSend: boolean;
  pendingAssistantMessageId: string | null;
  messages: SessionMessageRecord[];
}

export interface RelayDispatchRequest {
  workerId: string;
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  bodyText: string;
}

export interface RelayDispatchResult {
  assistantText?: string;
  completedAt?: string;
  failureCode?: string;
}

export interface ChatRelayTransport {
  deliver(
    request: RelayDispatchRequest
  ): Promise<RelayDispatchResult | void>;
}
