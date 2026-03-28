export type WorkerChatBootstrapStatus = "ready" | "failed";
export type WorkerConversationMode = "temporary" | "standard" | "unknown";

export interface WorkerChatBootstrapRequest {
  sessionId: string;
}

export interface WorkerChatBootstrapResult {
  status: WorkerChatBootstrapStatus;
  conversationMode: WorkerConversationMode;
  modelLabel: string | null;
  failureCode: string | null;
  pageUrl: string | null;
}
