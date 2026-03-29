export type WorkerChatBootstrapStatus = "ready" | "failed";
export type WorkerConversationMode = "temporary" | "standard" | "unknown";
export type WorkerChatBootstrapStep =
  | "navigation"
  | "auth_check"
  | "surface_entry"
  | "new_chat"
  | "temporary_entry"
  | "temporary_confirmation"
  | "temporary_onboarding"
  | "model_selection"
  | "composer_ready"
  | "complete";
export type WorkerChatBootstrapFailureCode =
  | "bootstrap_navigation_failed"
  | "bootstrap_auth_required"
  | "bootstrap_challenge_detected"
  | "bootstrap_surface_unusable"
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
  step: WorkerChatBootstrapStep;
  stepDetail: string | null;
  composerReady: boolean;
  challengeDetected: boolean;
  pageTitle: string | null;
  runtimeUsability:
    | "usable"
    | "auth_required"
    | "challenge_blocked"
    | "surface_unusable";
  pageUrl: string | null;
}
