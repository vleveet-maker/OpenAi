import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

import express from "express";
import type { BrowserContext } from "playwright";

import {
  launchWorkerBrowser,
  type WorkerRuntimeMode,
  type WorkerBrowserHandle
} from "./browser-launch.js";
import {
  runTemporaryChatBootstrap,
  toBootstrapBrowserContext
} from "./chat-bootstrap/temporary-chat-runner.js";
import type {
  WorkerChatBootstrapRequest,
  WorkerChatBootstrapResult
} from "./chat-bootstrap/bootstrap-types.js";
import {
  runRelay,
  toRelayBrowserContext
} from "./chat-relay/relay-runner.js";
import type {
  WorkerRelayRequest,
  WorkerRelayResult
} from "./chat-relay/relay-types.js";

type WorkerRuntimeStatus =
  | "starting"
  | "ready"
  | "busy"
  | "disconnected"
  | "reauth_required";

export interface WorkerAgentConfig {
  workerId: string;
  displayName: string;
  containerName: string;
  host: string;
  port: number;
  profilePath: string;
  runtimeMode: WorkerRuntimeMode;
  browserChannel?: string;
  browserExecutablePath?: string;
  cdpEndpointUrl?: string;
  headless: boolean;
  proxyServer?: string;
  startUrl: string;
  preferredReasoningModelLabels: string[];
}

export interface WorkerHealthSnapshot {
  runtimeStatus: WorkerRuntimeStatus;
  browserContextReady: boolean;
  lastRelayAt: string | null;
  lastRelayFailureCode: string | null;
  runtimeMode: WorkerRuntimeMode;
  headless: boolean;
  cdpAttached: boolean;
  proxyServerConfigured: boolean;
}

export interface WorkerBrowserAccessSnapshot {
  enabled: boolean;
  ready: boolean;
  httpPort: number;
  display: string;
}

export const DEFAULT_PREFERRED_REASONING_MODEL_LABELS = [
  "GPT-5.4 Thinking",
  "GPT-5.4"
];

export function parseWorkerRuntimeMode(
  value: string | undefined,
  fallback: WorkerRuntimeMode = "hidden_runtime"
): WorkerRuntimeMode {
  if (value === "visible_auth" || value === "hidden_runtime") {
    return value;
  }

  return fallback;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return fallback;
}

function parsePreferredReasoningModelLabels(
  value: string | undefined
): string[] {
  if (!value || value.trim().length === 0) {
    return [...DEFAULT_PREFERRED_REASONING_MODEL_LABELS];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      const labels = parsed
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      if (labels.length > 0) {
        return labels;
      }
    }
  } catch {
    // Fall back to comma-separated parsing below.
  }

  const labels = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return labels.length > 0
    ? labels
    : [...DEFAULT_PREFERRED_REASONING_MODEL_LABELS];
}

function resolveBrowserAccessSnapshot(
  env: NodeJS.ProcessEnv,
  browserContextReady: boolean
): WorkerBrowserAccessSnapshot {
  const httpPort = parsePort(env.BROWSER_ACCESS_HTTP_PORT, 6080);
  const display = env.DISPLAY ?? ":99";
  const enabled = httpPort > 0 && display.trim().length > 0;

  return {
    enabled,
    ready: enabled && browserContextReady,
    httpPort,
    display
  };
}

function resolveRuntimeFailureCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.trim()
  ) {
    return error.code;
  }

  return "worker_runtime_error";
}

export function loadWorkerAgentConfig(
  env: NodeJS.ProcessEnv = process.env
): WorkerAgentConfig {
  const workerId = env.WORKER_ID ?? "shared-1";
  const runtimeMode = parseWorkerRuntimeMode(
    env.WORKER_RUNTIME_MODE,
    env.WORKER_CDP_ENDPOINT_URL ? "visible_auth" : "hidden_runtime"
  );
  const headless =
    runtimeMode === "hidden_runtime"
      ? true
      : parseBoolean(env.WORKER_HEADLESS, false);

  return {
    workerId,
    displayName: env.WORKER_DISPLAY_NAME ?? workerId,
    containerName: env.WORKER_CONTAINER_NAME ?? `worker-${workerId}`,
    host: env.WORKER_AGENT_HOST ?? "0.0.0.0",
    port: parsePort(env.WORKER_AGENT_PORT, 4020),
    profilePath:
      env.WORKER_PROFILE_PATH ??
      `/srv/chatgpt-workers/profiles/${workerId}`,
    runtimeMode,
    browserChannel: env.WORKER_BROWSER_CHANNEL,
    browserExecutablePath: env.WORKER_BROWSER_EXECUTABLE_PATH,
    cdpEndpointUrl: env.WORKER_CDP_ENDPOINT_URL,
    headless,
    proxyServer: env.WORKER_PROXY_SERVER,
    startUrl: env.WORKER_START_URL ?? "https://chatgpt.com/",
    preferredReasoningModelLabels: parsePreferredReasoningModelLabels(
      env.WORKER_PREFERRED_REASONING_MODEL_LABELS
    )
  };
}

export interface WorkerAgentRuntime {
  config: WorkerAgentConfig;
  getBrowserContext(): Promise<BrowserContext>;
  getHealthSnapshot(): WorkerHealthSnapshot;
  getBrowserAccessSnapshot(): WorkerBrowserAccessSnapshot;
  bootstrapSessionChat(
    request: WorkerChatBootstrapRequest
  ): Promise<WorkerChatBootstrapResult>;
  relayMessage(request: WorkerRelayRequest): Promise<WorkerRelayResult>;
  dispose(): Promise<void>;
}

export interface WorkerAgentRuntimeOptions {
  browserHandlePromise?: Promise<WorkerBrowserHandle>;
  browserContextPromise?: Promise<BrowserContext>;
  bootstrapHandler?: (
    request: WorkerChatBootstrapRequest,
    browserContext: BrowserContext,
    config: WorkerAgentConfig
  ) => Promise<WorkerChatBootstrapResult>;
  relayHandler?: (
    request: WorkerRelayRequest,
    browserContext: BrowserContext
  ) => Promise<WorkerRelayResult>;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseRelayRequest(body: unknown): WorkerRelayRequest | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;

  if (
    !isNonEmptyString(candidate.sessionId) ||
    !isNonEmptyString(candidate.userMessageId) ||
    !isNonEmptyString(candidate.assistantMessageId) ||
    !isNonEmptyString(candidate.bodyText)
  ) {
    return null;
  }

  return {
    sessionId: candidate.sessionId.trim(),
    userMessageId: candidate.userMessageId.trim(),
    assistantMessageId: candidate.assistantMessageId.trim(),
    bodyText: candidate.bodyText.trim()
  };
}

function parseBootstrapRequest(body: unknown): WorkerChatBootstrapRequest | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;

  if (!isNonEmptyString(candidate.sessionId)) {
    return null;
  }

  return {
    sessionId: candidate.sessionId.trim()
  };
}

export function createWorkerAgentRuntime(
  config: WorkerAgentConfig = loadWorkerAgentConfig(),
  options: WorkerAgentRuntimeOptions = {}
): WorkerAgentRuntime {
  const runtimeState: WorkerHealthSnapshot = {
    runtimeStatus: "starting",
    browserContextReady: false,
    lastRelayAt: null,
    lastRelayFailureCode: null,
    runtimeMode: config.runtimeMode,
    headless: config.headless,
    cdpAttached: Boolean(config.cdpEndpointUrl),
    proxyServerConfigured: Boolean(config.proxyServer)
  };
  const browserHandlePromise =
    options.browserHandlePromise ??
    (options.browserContextPromise
        ? options.browserContextPromise.then((browserContext) => ({
          browserContext,
          async dispose() {
            await browserContext.close();
          }
        }))
      : launchWorkerBrowser({
          workerId: config.workerId,
          profilePath: config.profilePath,
          runtimeMode: config.runtimeMode,
          browserChannel: config.browserChannel,
          browserExecutablePath: config.browserExecutablePath,
          cdpEndpointUrl: config.cdpEndpointUrl,
          headless: config.headless,
          proxyServer: config.proxyServer,
          startUrl: config.startUrl
        }));
  const instrumentedBrowserHandlePromise = browserHandlePromise
    .then((browserHandle) => {
      runtimeState.browserContextReady = true;
      runtimeState.runtimeStatus = "ready";
      return browserHandle;
    })
    .catch((error: unknown) => {
      runtimeState.browserContextReady = false;
      runtimeState.runtimeStatus = "disconnected";
      runtimeState.lastRelayFailureCode = resolveRuntimeFailureCode(error);
      throw error;
    });
  const relayHandler = options.relayHandler;
  const bootstrapHandler = options.bootstrapHandler;

  return {
    config,
    async getBrowserContext() {
      return (await instrumentedBrowserHandlePromise).browserContext;
    },
    getHealthSnapshot() {
      return {
        ...runtimeState
      };
    },
    getBrowserAccessSnapshot() {
      return resolveBrowserAccessSnapshot(process.env, runtimeState.browserContextReady);
    },
    async bootstrapSessionChat(request: WorkerChatBootstrapRequest) {
      const browserContext = (await instrumentedBrowserHandlePromise).browserContext;
      const bootstrapResult = bootstrapHandler
        ? await bootstrapHandler(request, browserContext, config)
        : await runTemporaryChatBootstrap(
            toBootstrapBrowserContext(browserContext),
            {
              lockKey: `${config.workerId}:${request.sessionId}`,
              startUrl: config.startUrl,
              preferredReasoningModelLabels: config.preferredReasoningModelLabels
            }
          );

      runtimeState.runtimeStatus =
        bootstrapResult.failureCode === "bootstrap_auth_required"
          ? "reauth_required"
          : "ready";

      return bootstrapResult;
    },
    async relayMessage(request: WorkerRelayRequest) {
      const browserContext = (await instrumentedBrowserHandlePromise).browserContext;

      try {
        const relayResult = relayHandler
          ? await relayHandler(request, browserContext)
          : await runRelay(toRelayBrowserContext(browserContext), request, {
              lockKey: config.workerId,
              startUrl: config.startUrl
            });

        runtimeState.lastRelayAt = new Date().toISOString();
        runtimeState.lastRelayFailureCode = relayResult.failureCode;
        runtimeState.runtimeStatus =
          relayResult.failureClass === "auth" ? "reauth_required" : "ready";

        return relayResult;
      } catch (error: unknown) {
        runtimeState.lastRelayAt = new Date().toISOString();
        runtimeState.lastRelayFailureCode = resolveRuntimeFailureCode(error);
        runtimeState.runtimeStatus = "disconnected";
        throw error;
      }
    },
    async dispose() {
      const browserHandle = await instrumentedBrowserHandlePromise;
      await browserHandle.dispose();
    }
  };
}

export function createWorkerAgentApp(
  runtime: WorkerAgentRuntime = createWorkerAgentRuntime()
) {
  const { config } = runtime;
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_request, response) => {
    const healthSnapshot = runtime.getHealthSnapshot();
    const browserAccess = runtime.getBrowserAccessSnapshot();

    response.json({
      service: "worker-agent",
      workerId: config.workerId,
      containerName: config.containerName,
      profilePath: config.profilePath,
      runtimeMode: healthSnapshot.runtimeMode,
      headless: healthSnapshot.headless,
      cdpAttached: healthSnapshot.cdpAttached,
      proxyServerConfigured: healthSnapshot.proxyServerConfigured,
      runtimeStatus: healthSnapshot.runtimeStatus,
      browserContextReady: healthSnapshot.browserContextReady,
      lastRelayAt: healthSnapshot.lastRelayAt,
      lastRelayFailureCode: healthSnapshot.lastRelayFailureCode,
      browserAccess
    });
  });

  app.get("/internal/worker", (_request, response) => {
    const browserAccess = runtime.getBrowserAccessSnapshot();

    response.json({
      workerId: config.workerId,
      displayName: config.displayName,
      containerName: config.containerName,
      profilePath: config.profilePath,
      browserAccess
    });
  });

  app.post("/internal/relay/messages", async (request, response) => {
    const relayRequest = parseRelayRequest(request.body);

    if (!relayRequest) {
      response.status(400).json({
        error: "invalid_relay_request",
        detail:
          "sessionId, userMessageId, assistantMessageId, and bodyText must be non-empty strings"
      });
      return;
    }

    const relayResult = await runtime.relayMessage(relayRequest);
    response.json(relayResult);
  });

  app.post("/internal/chat/bootstrap", async (request, response) => {
    const bootstrapRequest = parseBootstrapRequest(request.body);

    if (!bootstrapRequest) {
      response.status(400).json({
        error: "invalid_chat_bootstrap_request",
        detail: "sessionId must be a non-empty string"
      });
      return;
    }

    const bootstrapResult = await runtime.bootstrapSessionChat(bootstrapRequest);
    response.json(bootstrapResult);
  });

  return app;
}

async function startWorkerAgent(config: WorkerAgentConfig = loadWorkerAgentConfig()) {
  const runtime = createWorkerAgentRuntime(config);
  const app = createWorkerAgentApp(runtime);
  void runtime.getBrowserContext().catch((error: unknown) => {
    console.error("[worker-agent] browser bootstrap failed", error);
  });

  return new Promise<import("node:http").Server>((resolve) => {
    const server = app.listen(config.port, config.host, () => {
      resolve(server);
    });

    server.on("close", () => {
      void runtime.dispose();
    });
  });
}

function formatAddress(address: string | AddressInfo | null): string {
  if (!address) {
    return "unknown";
  }

  if (typeof address === "string") {
    return address;
  }

  return `${address.address}:${address.port}`;
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startWorkerAgent()
    .then((server) => {
      console.log(
        `[worker-agent] listening on ${formatAddress(server.address())}`
      );
    })
    .catch((error: unknown) => {
      console.error("[worker-agent] failed to start", error);
      process.exitCode = 1;
    });
}
