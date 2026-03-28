export interface WorkerRelayRequest {
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  bodyText: string;
}

export type WorkerRelayFailureCode =
  | "selector_not_found"
  | "composer_selector_not_found"
  | "send_button_selector_not_found"
  | "assistant_turn_selector_not_found"
  | "submit_failed"
  | "capture_failed"
  | "reply_empty"
  | "reply_timeout";

export interface WorkerRelayResult {
  assistantText: string | null;
  completedAt: string;
  pageUrl: string | null;
  failureCode: WorkerRelayFailureCode | null;
  failureClass: "transient" | "auth" | "fatal" | null;
  failureStage: "dispatch" | "submitted" | "capture" | null;
  submittedAt: string | null;
}
