export interface WorkerRelayRequest {
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  bodyText: string;
}

export interface WorkerRelayResult {
  assistantText: string | null;
  completedAt: string;
  pageUrl: string | null;
  failureCode: string | null;
}
