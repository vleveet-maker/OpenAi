import type {
  ChatBootstrapResult,
  ChatBootstrapTransport
} from "../src/chat/chat-bootstrap-types.js";

function normalizeResult(
  partial: Partial<ChatBootstrapResult> = {}
): ChatBootstrapResult {
  return {
    status: partial.status ?? "ready",
    conversationMode: partial.conversationMode ?? "temporary",
    modelLabel: partial.modelLabel ?? "GPT-5.4 Thinking",
    failureCode: partial.failureCode ?? null
  };
}

export function createReadyBootstrapTransport(
  partial: Partial<ChatBootstrapResult> = {}
): ChatBootstrapTransport {
  const result = normalizeResult(partial);

  return {
    async bootstrap() {
      return result;
    }
  };
}

export function createPendingBootstrapTransport(): ChatBootstrapTransport {
  return {
    async bootstrap() {
      return new Promise(() => undefined);
    }
  };
}
