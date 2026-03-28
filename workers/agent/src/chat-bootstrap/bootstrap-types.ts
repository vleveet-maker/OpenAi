export type WorkerChatBootstrapStatus = "ready" | "failed";
export type WorkerConversationMode = "temporary" | "standard" | "unknown";
export type WorkerChatBootstrapFailureCode =
  | "bootstrap_navigation_failed"
  | "bootstrap_auth_required"
  | "bootstrap_selector_not_found"
  | "new_chat_selector_not_found"
  | "temporary_chat_unavailable"
  | "temporary_entry_not_found"
  | "temporary_confirmation_not_found"
  | "model_not_available"
  | "model_picker_not_found"
  | "model_option_not_found";

export interface WorkerChatBootstrapRequest {
  sessionId: string;
}

export interface WorkerChatBootstrapResult {
  status: WorkerChatBootstrapStatus;
  conversationMode: WorkerConversationMode;
  modelLabel: string | null;
  failureCode: WorkerChatBootstrapFailureCode | null;
  pageUrl: string | null;
}
