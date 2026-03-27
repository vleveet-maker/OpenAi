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

export const RELAY_FAILURE_CLASSES = [
  "transient",
  "auth",
  "fatal"
] as const;

export type RelayFailureClass = (typeof RELAY_FAILURE_CLASSES)[number];

export const RELAY_ATTEMPT_STAGES = [
  "dispatch",
  "submitted",
  "capture"
] as const;

export type RelayAttemptStage = (typeof RELAY_ATTEMPT_STAGES)[number];

export const RELAY_JOB_STATES = [
  "queued",
  "dispatching",
  "retry_wait",
  "failed",
  "completed"
] as const;

export type RelayJobState = (typeof RELAY_JOB_STATES)[number];

export const RELAY_STATUS_VALUES = [
  "idle",
  "dispatching",
  "retrying",
  "failed",
  "completed"
] as const;

export type RelayStatus = (typeof RELAY_STATUS_VALUES)[number];

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

export interface RelayJobRecord {
  assistantMessageId: string;
  sessionId: string;
  workerId: string;
  userMessageId: string;
  state: RelayJobState;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  lastFailureCode: string | null;
  lastFailureClass: RelayFailureClass | null;
  lastFailureStage: RelayAttemptStage | null;
}

export interface RelayStatusSnapshot {
  status: RelayStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastFailureCode: string | null;
  lastFailureClass: RelayFailureClass | null;
}

export interface ConversationSnapshot {
  sessionId: string;
  worker: PublicWorkerSummary | null;
  canSend: boolean;
  pendingAssistantMessageId: string | null;
  relay: RelayStatusSnapshot;
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
  failureClass?: RelayFailureClass;
  failureStage?: RelayAttemptStage;
  submittedAt?: string;
}

export interface ChatRelayTransport {
  deliver(
    request: RelayDispatchRequest
  ): Promise<RelayDispatchResult | void>;
}
