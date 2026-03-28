import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

import express from "express";
import type { BrowserContext } from "playwright";

import { launchWorkerBrowser } from "./browser-launch.js";
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
  browserChannel?: string;
  headless: boolean;
  startUrl: string;
}

export interface WorkerHealthSnapshot {
  runtimeStatus: WorkerRuntimeStatus;
  browserContextReady: boolean;
  lastRelayAt: string | null;
  lastRelayFailureCode: string | null;
}

export interface WorkerBrowserAccessSnapshot {
  enabled: boolean;
  ready: boolean;
  httpPort: number;
  display: string;
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

  return {
    workerId,
    displayName: env.WORKER_DISPLAY_NAME ?? workerId,
    containerName: env.WORKER_CONTAINER_NAME ?? `worker-${workerId}`,
    host: env.WORKER_AGENT_HOST ?? "0.0.0.0",
    port: parsePort(env.WORKER_AGENT_PORT, 4020),
    profilePath:
      env.WORKER_PROFILE_PATH ??
      `/srv/chatgpt-workers/profiles/${workerId}`,
    browserChannel: env.WORKER_BROWSER_CHANNEL,
    headless: parseBoolean(env.WORKER_HEADLESS, false),
    startUrl: env.WORKER_START_URL ?? "https://chatgpt.com/"
  };
}

export interface WorkerAgentRuntime {
  config: WorkerAgentConfig;
  getBrowserContext(): Promise<BrowserContext>;
  getHealthSnapshot(): WorkerHealthSnapshot;
  getBrowserAccessSnapshot(): WorkerBrowserAccessSnapshot;
  relayMessage(request: WorkerRelayRequest): Promise<WorkerRelayResult>;
  dispose(): Promise<void>;
}

export interface WorkerAgentRuntimeOptions {
  browserContextPromise?: Promise<BrowserContext>;
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

export function createWorkerAgentRuntime(
  config: WorkerAgentConfig = loadWorkerAgentConfig(),
  options: WorkerAgentRuntimeOptions = {}
): WorkerAgentRuntime {
  const runtimeState: WorkerHealthSnapshot = {
    runtimeStatus: "starting",
    browserContextReady: false,
    lastRelayAt: null,
    lastRelayFailureCode: null
  };
  const browserContextPromise =
    options.browserContextPromise ??
    launchWorkerBrowser({
      workerId: config.workerId,
      profilePath: config.profilePath,
      browserChannel: config.browserChannel,
      headless: config.headless,
      startUrl: config.startUrl
    });
  const instrumentedBrowserContextPromise = browserContextPromise
    .then((browserContext) => {
      runtimeState.browserContextReady = true;
      runtimeState.runtimeStatus = "ready";
      return browserContext;
    })
    .catch((error: unknown) => {
      runtimeState.browserContextReady = false;
      runtimeState.runtimeStatus = "disconnected";
      runtimeState.lastRelayFailureCode = resolveRuntimeFailureCode(error);
      throw error;
    });
  const relayHandler = options.relayHandler;

  return {
    config,
    async getBrowserContext() {
      return instrumentedBrowserContextPromise;
    },
    getHealthSnapshot() {
      return {
        ...runtimeState
      };
    },
    getBrowserAccessSnapshot() {
      return resolveBrowserAccessSnapshot(process.env, runtimeState.browserContextReady);
    },
    async relayMessage(request: WorkerRelayRequest) {
      const browserContext = await instrumentedBrowserContextPromise;

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
      const browserContext = await instrumentedBrowserContextPromise;
      await browserContext.close();
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
