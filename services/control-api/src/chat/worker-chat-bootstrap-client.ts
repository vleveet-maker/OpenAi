import type {
  ChatBootstrapRequest,
  ChatBootstrapResult
} from "./chat-bootstrap-types.js";

export interface WorkerChatBootstrapClient {
  bootstrap(
    agentBaseUrl: string,
    request: ChatBootstrapRequest
  ): Promise<ChatBootstrapResult>;
}

export class WorkerChatBootstrapClientError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function buildBootstrapUrl(agentBaseUrl: string): string {
  return new URL("/internal/chat/bootstrap", `${agentBaseUrl}/`).toString();
}

export class FetchWorkerChatBootstrapClient
  implements WorkerChatBootstrapClient {
  async bootstrap(
    agentBaseUrl: string,
    request: ChatBootstrapRequest
  ): Promise<ChatBootstrapResult> {
    const timeoutSignal = AbortSignal.timeout(20_000);
    let response: Response;

    try {
      response = await fetch(buildBootstrapUrl(agentBaseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sessionId: request.sessionId
        }),
        signal: timeoutSignal
      });
    } catch (error: unknown) {
      if (timeoutSignal.aborted) {
        throw new WorkerChatBootstrapClientError(
          "worker_chat_bootstrap_timeout",
          "Worker chat bootstrap request timed out after 20000 ms"
        );
      }

      throw new WorkerChatBootstrapClientError(
        "worker_chat_bootstrap_unreachable",
        error instanceof Error
          ? error.message
          : "Worker chat bootstrap request failed before a response was received"
      );
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: string; detail?: string }
        | null;

      throw new WorkerChatBootstrapClientError(
        errorBody?.error ?? `worker_chat_bootstrap_http_${response.status}`,
        errorBody?.detail ??
          `Worker chat bootstrap request failed with status ${response.status}`
      );
    }

    const payload = (await response.json()) as Partial<ChatBootstrapResult>;

    return {
      status:
        payload.status === "pending" ||
        payload.status === "ready" ||
        payload.status === "failed"
          ? payload.status
          : "failed",
      conversationMode:
        payload.conversationMode === "temporary" ||
        payload.conversationMode === "standard" ||
        payload.conversationMode === "unknown"
          ? payload.conversationMode
          : "unknown",
      modelLabel:
        typeof payload.modelLabel === "string" && payload.modelLabel.trim().length > 0
          ? payload.modelLabel
          : null,
      failureCode:
        typeof payload.failureCode === "string" && payload.failureCode.trim().length > 0
          ? payload.failureCode
          : null
    };
  }
}

export function createWorkerChatBootstrapClient(): WorkerChatBootstrapClient {
  return new FetchWorkerChatBootstrapClient();
}
