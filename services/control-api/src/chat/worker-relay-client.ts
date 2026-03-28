import type {
  RelayDispatchRequest,
  RelayDispatchResult
} from "./chat-types.js";

export interface WorkerRelayClient {
  deliver(
    agentBaseUrl: string,
    request: RelayDispatchRequest
  ): Promise<RelayDispatchResult>;
}

export class WorkerRelayClientError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const GRANULAR_WORKER_RELAY_FAILURE_CODES = new Set([
  "composer_selector_not_found",
  "send_button_selector_not_found",
  "assistant_turn_selector_not_found"
]);

function buildRelayUrl(agentBaseUrl: string): string {
  return new URL("/internal/relay/messages", `${agentBaseUrl}/`).toString();
}

function parseRelayFailureCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (GRANULAR_WORKER_RELAY_FAILURE_CODES.has(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export class FetchWorkerRelayClient implements WorkerRelayClient {
  async deliver(
    agentBaseUrl: string,
    request: RelayDispatchRequest
  ): Promise<RelayDispatchResult> {
    const timeoutSignal = AbortSignal.timeout(15_000);
    let response: Response;

    try {
      response = await fetch(buildRelayUrl(agentBaseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sessionId: request.sessionId,
          userMessageId: request.userMessageId,
          assistantMessageId: request.assistantMessageId,
          bodyText: request.bodyText
        }),
        signal: timeoutSignal
      });
    } catch (error: unknown) {
      if (timeoutSignal.aborted) {
        throw new WorkerRelayClientError(
          "worker_relay_timeout",
          "Worker relay request timed out after 15000 ms"
        );
      }

      throw new WorkerRelayClientError(
        "worker_relay_unreachable",
        error instanceof Error
          ? error.message
          : "Worker relay request failed before a response was received"
      );
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: string; detail?: string }
        | null;

      throw new WorkerRelayClientError(
        errorBody?.error ?? `worker_relay_http_${response.status}`,
        errorBody?.detail ??
          `Worker relay request failed with status ${response.status}`
      );
    }

    const payload = (await response.json()) as Partial<RelayDispatchResult>;

    return {
      assistantText:
        typeof payload.assistantText === "string"
          ? payload.assistantText
          : undefined,
      completedAt:
        typeof payload.completedAt === "string"
          ? payload.completedAt
          : new Date().toISOString(),
      failureCode:
        parseRelayFailureCode(payload.failureCode),
      failureClass:
        payload.failureClass === "transient" ||
        payload.failureClass === "auth" ||
        payload.failureClass === "fatal"
          ? payload.failureClass
          : undefined,
      failureStage:
        payload.failureStage === "dispatch" ||
        payload.failureStage === "submitted" ||
        payload.failureStage === "capture"
          ? payload.failureStage
          : undefined,
      submittedAt:
        typeof payload.submittedAt === "string"
          ? payload.submittedAt
          : undefined
    };
  }
}

export function createWorkerRelayClient(): WorkerRelayClient {
  return new FetchWorkerRelayClient();
}
