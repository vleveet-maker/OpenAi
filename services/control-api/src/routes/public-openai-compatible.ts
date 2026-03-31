import { randomUUID } from "node:crypto";

import { type NextFunction, type Request, type Response, Router } from "express";

import {
  RemoteRelayService,
  RemoteRelayServiceError,
  type RemoteRelayAskRequest,
  type RemoteRelayAskResponse
} from "../remote/remote-relay-service.js";

const DEFAULT_COMPAT_MODEL = "owmcgp-browser";
const MODEL_ALIASES = new Set([
  DEFAULT_COMPAT_MODEL,
  "gpt-5.4-thinking",
  "chatgpt-browser-gpt-5.4-thinking",
  "GPT-5.4 Thinking"
]);

interface OpenAiCompatibleRouterOptions {
  remoteRelayService: RemoteRelayService;
  apiToken: string;
}

interface ParsedChatCompletionRequest {
  model: string;
  conversationId: string | null;
  workerId: string | null;
  requestedForLabel: string | null;
  timeoutMs: number | null;
  keepDialogOpen: boolean;
  messageText: string;
}

function requireRemoteRelayToken(apiToken: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const header = request.header("authorization");

    if (!header || !header.startsWith("Bearer ")) {
      response.status(401).json({
        error: {
          message: "Missing bearer token",
          type: "invalid_request_error",
          code: "remote_relay_unauthorized"
        }
      });
      return;
    }

    const providedToken = header.slice("Bearer ".length).trim();

    if (providedToken !== apiToken) {
      response.status(403).json({
        error: {
          message: "Bearer token is not valid for this relay",
          type: "invalid_request_error",
          code: "remote_relay_forbidden"
        }
      });
      return;
    }

    next();
  };
}

function handleRemoteRelayError(
  error: unknown,
  response: Response
): boolean {
  if (!(error instanceof RemoteRelayServiceError)) {
    return false;
  }

  response.status(error.statusCode).json({
    error: {
      message: error.detail,
      type: "invalid_request_error",
      code: error.code
    }
  });
  return true;
}

function createModelsResponse() {
  const created = Math.floor(Date.now() / 1000);

  return {
    object: "list",
    data: [
      {
        id: DEFAULT_COMPAT_MODEL,
        object: "model",
        created,
        owned_by: "owmcgp"
      },
      {
        id: "gpt-5.4-thinking",
        object: "model",
        created,
        owned_by: "owmcgp"
      },
      {
        id: "chatgpt-browser-gpt-5.4-thinking",
        object: "model",
        created,
        owned_by: "owmcgp"
      }
    ]
  };
}

function parseChatCompletionRequest(body: unknown): ParsedChatCompletionRequest {
  if (!body || typeof body !== "object") {
    throw new RemoteRelayServiceError(
      400,
      "invalid_request_body",
      "Request body must be a JSON object"
    );
  }

  const payload = body as Record<string, unknown>;

  if (payload.stream === true) {
    throw new RemoteRelayServiceError(
      400,
      "stream_not_supported",
      "Streaming is not supported yet; send stream=false or omit it"
    );
  }

  const model = parseModel(payload.model);
  const conversationId = parseOptionalString(payload.conversation_id, "conversation_id");
  const workerId = parseOptionalString(payload.worker_id, "worker_id");
  const requestedForLabel = parseOptionalString(payload.user, "user");
  const timeoutMs = parseOptionalPositiveInteger(payload.timeout_ms, "timeout_ms");
  const keepDialogOpen = parseOptionalBoolean(
    payload.keep_dialog_open,
    "keep_dialog_open",
    false
  );
  const messageText = parseMessages(payload.messages);

  return {
    model,
    conversationId,
    workerId,
    requestedForLabel,
    timeoutMs,
    keepDialogOpen,
    messageText
  };
}

function parseModel(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RemoteRelayServiceError(
      400,
      "invalid_model",
      "model must be a non-empty string"
    );
  }

  const trimmed = value.trim();

  if (!MODEL_ALIASES.has(trimmed)) {
    throw new RemoteRelayServiceError(
      400,
      "invalid_model",
      `Unsupported model "${trimmed}". Use ${Array.from(MODEL_ALIASES).join(", ")}`
    );
  }

  return trimmed;
}

function parseOptionalString(value: unknown, fieldName: string): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new RemoteRelayServiceError(
      400,
      `invalid_${fieldName}`,
      `${fieldName} must be a string when provided`
    );
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalPositiveInteger(
  value: unknown,
  fieldName: string
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RemoteRelayServiceError(
      400,
      `invalid_${fieldName}`,
      `${fieldName} must be a positive number when provided`
    );
  }

  return Math.floor(value);
}

function parseOptionalBoolean(
  value: unknown,
  fieldName: string,
  fallback: boolean
): boolean {
  if (value == null) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new RemoteRelayServiceError(
      400,
      `invalid_${fieldName}`,
      `${fieldName} must be a boolean when provided`
    );
  }

  return value;
}

function parseMessages(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RemoteRelayServiceError(
      400,
      "invalid_messages",
      "messages must be a non-empty array"
    );
  }

  const lastUserMessage = [...value]
    .reverse()
    .find((entry) => {
      return Boolean(
        entry &&
        typeof entry === "object" &&
        (entry as Record<string, unknown>).role === "user"
      );
    });

  if (!lastUserMessage || typeof lastUserMessage !== "object") {
    throw new RemoteRelayServiceError(
      400,
      "user_message_missing",
      "messages must contain at least one user message"
    );
  }

  const content = (lastUserMessage as Record<string, unknown>).content;
  const messageText = parseMessageContent(content);

  if (messageText.trim().length === 0) {
    throw new RemoteRelayServiceError(
      400,
      "invalid_message_text",
      "The last user message must contain non-empty text content"
    );
  }

  return messageText.trim();
}

function parseMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    throw new RemoteRelayServiceError(
      400,
      "unsupported_message_content",
      "Only text message content is supported right now"
    );
  }

  const parts: string[] = [];

  for (const item of content) {
    if (!item || typeof item !== "object") {
      throw new RemoteRelayServiceError(
        400,
        "unsupported_message_content",
        "Only text content parts are supported right now"
      );
    }

    const part = item as Record<string, unknown>;
    const type = typeof part.type === "string" ? part.type : "";

    if ((type === "text" || type === "input_text") && typeof part.text === "string") {
      parts.push(part.text);
      continue;
    }

    throw new RemoteRelayServiceError(
      400,
      "unsupported_message_content",
      "Only text content parts are supported right now"
    );
  }

  return parts.join("\n");
}

function estimateTokens(text: string): number {
  const normalized = text.trim();

  if (normalized.length === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

function createChatCompletionResponse(
  request: ParsedChatCompletionRequest,
  result: RemoteRelayAskResponse,
  options: {
    conversationId: string | null;
    dialogClosed: boolean;
  }
) {
  const created = Math.floor(Date.now() / 1000);
  const promptTokens = estimateTokens(request.messageText);
  const completionTokens = estimateTokens(result.assistantReplyText);

  return {
    id: `chatcmpl_${randomUUID().replace(/-/g, "")}`,
    object: "chat.completion",
    created,
    model: request.model,
    actual_model_label: result.modelLabel,
    conversation_id: options.conversationId,
    dialog_closed: options.dialogClosed,
    worker_id: result.workerId,
    conversation_mode: result.conversationMode,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: result.assistantReplyText
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}

function createAskRequest(
  request: ParsedChatCompletionRequest
): RemoteRelayAskRequest {
  return {
    requestedForLabel: request.requestedForLabel ?? "OpenAI-compatible relay",
    workerId: request.workerId,
    dialogId: request.conversationId,
    newDialog: request.conversationId === null,
    messageText: request.messageText,
    timeoutMs: request.timeoutMs
  };
}

export function createPublicOpenAiCompatibleRouter(
  options: OpenAiCompatibleRouterOptions
) {
  const router = Router();
  const requireToken = requireRemoteRelayToken(options.apiToken);

  router.use("/v1", requireToken);

  router.get("/v1/models", (_request, response) => {
    response.json(createModelsResponse());
  });

  router.post("/v1/chat/completions", async (request, response) => {
    try {
      const parsedRequest = parseChatCompletionRequest(request.body);
      const createdFreshDialog = parsedRequest.conversationId === null;
      const result = await options.remoteRelayService.ask(
        createAskRequest(parsedRequest)
      );
      let responseConversationId: string | null = result.dialogId;
      let dialogClosed = false;

      if (createdFreshDialog && !parsedRequest.keepDialogOpen) {
        options.remoteRelayService.endDialog(result.dialogId);
        responseConversationId = null;
        dialogClosed = true;
      }

      response.json(
        createChatCompletionResponse(parsedRequest, result, {
          conversationId: responseConversationId,
          dialogClosed
        })
      );
    } catch (error: unknown) {
      if (!handleRemoteRelayError(error, response)) {
        throw error;
      }
    }
  });

  return router;
}
