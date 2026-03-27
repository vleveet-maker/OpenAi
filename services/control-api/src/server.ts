import type { AddressInfo } from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";

import {
  ChatStore
} from "./chat/chat-store.js";
import {
  createChatRelayService,
  type ChatRelayService
} from "./chat/chat-relay-service.js";
import type { ChatRelayTransport } from "./chat/chat-types.js";
import { createWorkerRelayClient } from "./chat/worker-relay-client.js";
import { loadConfig, type ControlApiConfig } from "./config.js";
import { createInternalHealthRouter } from "./routes/internal-health.js";
import { createPublicChatRouter } from "./routes/public-chat.js";
import {
  createInternalRecoveryRouter,
  type InternalRecoverySession
} from "./routes/internal-recovery.js";
import { createInternalWorkerActionsRouter } from "./routes/internal-worker-actions.js";
import { createInternalWorkersRouter } from "./routes/internal-workers.js";
import { createPublicSessionsRouter } from "./routes/public-sessions.js";
import {
  createSessionService,
  type SessionService
} from "./sessions/session-service.js";
import { SessionStore } from "./sessions/session-store.js";
import { requireInternalAdmin } from "./security/internal-admin-guard.js";
import {
  createWorkerRegistry,
  type WorkerRegistry
} from "./workers/worker-registry.js";

export interface ControlApiRuntime {
  config: ControlApiConfig;
  workerRegistry: WorkerRegistry;
  recoverySessions: Map<string, InternalRecoverySession>;
  sessionStore: SessionStore;
  sessionService: SessionService;
  chatStore: ChatStore;
  chatRelayService: ChatRelayService;
  dispose(): void;
}

export function createControlApiRuntime(
  config: ControlApiConfig = loadConfig(),
  options: {
    relayTransport?: ChatRelayTransport;
  } = {}
): ControlApiRuntime {
  const workerRegistry = createWorkerRegistry(config.workerDefinitions);
  const workerRelayClient = createWorkerRelayClient();
  const sessionStore = new SessionStore(config.sessionDatabasePath);
  const sessionService = createSessionService({
    store: sessionStore,
    workerRegistry,
    sessionDurationMinutes: config.sessionDurationMinutes,
    sweepIntervalMs: config.sessionSweepIntervalMs
  });
  const chatStore = new ChatStore(config.sessionDatabasePath);
  const chatRelayService = createChatRelayService({
    chatStore,
    sessionService,
    relayTransport:
      options.relayTransport ??
      {
        async deliver(request) {
          const worker = workerRegistry.getWorker(request.workerId);

          if (!worker) {
            throw new Error(`Unknown worker for relay: ${request.workerId}`);
          }

          return workerRelayClient.deliver(worker.agentBaseUrl, request);
        }
      }
  });

  sessionService.bootstrap();

  return {
    config,
    workerRegistry,
    recoverySessions: new Map<string, InternalRecoverySession>(),
    sessionStore,
    sessionService,
    chatStore,
    chatRelayService,
    dispose() {
      sessionService.close();
      chatStore.close();
    }
  };
}

function registerSessionClientRoutes(
  app: ReturnType<typeof express>,
  runtime: ControlApiRuntime
): void {
  const { sessionClientDistPath } = runtime.config;

  if (!existsSync(sessionClientDistPath)) {
    return;
  }

  app.use(express.static(sessionClientDistPath, {
    index: false
  }));

  app.get(["/", "/session/:sessionId"], (_request, response) => {
    response.sendFile(join(sessionClientDistPath, "index.html"));
  });
}

export function createControlApiApp(
  runtime: ControlApiRuntime = createControlApiRuntime()
) {
  const {
    config,
    recoverySessions,
    sessionService,
    workerRegistry,
    chatRelayService
  } = runtime;
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/internal/bootstrap", (_request, response) => {
    response.json({
      service: config.serviceName,
      host: config.host,
      port: config.port,
      workerCount: config.workerDefinitions.length,
      statuses: config.workerDefinitions.map((worker) => ({
        workerId: worker.workerId,
        containerName: worker.containerName,
        defaultStatus: worker.defaultStatus
      }))
    });
  });

  app.use(
    createInternalHealthRouter({
      serviceName: config.serviceName,
      workerRegistry
    })
  );

  app.use(
    createPublicSessionsRouter({
      sessionService
    })
  );
  app.use(
    createPublicChatRouter({
      chatRelayService
    })
  );

  const internalAdminGuard = requireInternalAdmin({
    internalAdminToken: config.internalAdminToken,
    allowPrivateNetworks: true
  });

  app.use(internalAdminGuard, createInternalWorkersRouter({ workerRegistry }));
  app.use(
    internalAdminGuard,
    createInternalRecoveryRouter({
      workerRegistry,
      recoverySessions,
      sessionService
    }),
    createInternalWorkerActionsRouter({
      workerRegistry,
      sessionService
    })
  );

  registerSessionClientRoutes(app, runtime);

  return app;
}

export async function startControlApi(
  config: ControlApiConfig = loadConfig()
) {
  const runtime = createControlApiRuntime(config);
  runtime.sessionService.startBackgroundSweep();
  const app = createControlApiApp(runtime);

  return new Promise<import("node:http").Server>((resolve) => {
    const server = app.listen(config.port, config.host, () => {
      resolve(server);
    });

    server.on("close", () => {
      runtime.dispose();
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
  startControlApi()
    .then((server) => {
      console.log(
        `[control-api] bootstrap listening on ${formatAddress(server.address())}`
      );
    })
    .catch((error: unknown) => {
      console.error("[control-api] failed to start", error);
      process.exitCode = 1;
    });
}
