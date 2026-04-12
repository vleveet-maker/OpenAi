import type { AddressInfo } from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";

import {
  ChatBootstrapStore
} from "./chat/chat-bootstrap-store.js";
import {
  createChatBootstrapService,
  type ChatBootstrapService
} from "./chat/chat-bootstrap-service.js";
import {
  ChatStore
} from "./chat/chat-store.js";
import {
  createChatRelayService,
  type ChatRelayService
} from "./chat/chat-relay-service.js";
import type {
  ChatBootstrapTransport,
  SessionChatBootstrapRecord
} from "./chat/chat-bootstrap-types.js";
import type { ChatRelayTransport } from "./chat/chat-types.js";
import { createWorkerRelayClient } from "./chat/worker-relay-client.js";
import { createWorkerChatBootstrapClient } from "./chat/worker-chat-bootstrap-client.js";
import { loadConfig, type ControlApiConfig } from "./config.js";
import {
  createOperatorObservabilityService,
  OperatorEventStore,
  type OperatorObservabilityService
} from "./observability/operator-events.js";
import { createHealthRouter } from "./routes/internal-health.js";
import { createInternalAdminPageRouter } from "./routes/internal-admin-page.js";
import {
  createInternalDisconnectedBaselineRemediationRouter
} from "./routes/internal-disconnected-baseline-remediation.js";
import {
  createInternalDisconnectedRuntimeRemediationRouter
} from "./routes/internal-disconnected-runtime-remediation.js";
import {
  createInternalPersistentDisconnectedRuntimeFollowupRouter
} from "./routes/internal-persistent-disconnected-runtime-followup.js";
import {
  createInternalRuntimeParityBackportRemediationRouter
} from "./routes/internal-runtime-parity-backport-remediation.js";
import {
  createInternalPostParityDisconnectedRuntimeRemediationRouter
} from "./routes/internal-post-parity-disconnected-runtime-remediation.js";
import {
  createInternalPostPhase21DisconnectedRuntimeFollowupRouter
} from "./routes/internal-post-phase21-disconnected-runtime-followup.js";
import {
  createInternalPostPhase22SmokeWrapperParityRemediationRouter
} from "./routes/internal-post-phase22-smoke-wrapper-parity-remediation.js";
import {
  createInternalPostPhase23ExactSmokeWrapperCompatRemediationRouter
} from "./routes/internal-post-phase23-exact-smoke-wrapper-compat-remediation.js";
import {
  createInternalPostPhase24ExternalApiReadinessRouter
} from "./routes/internal-post-phase24-external-api-readiness.js";
import {
  createInternalPostPhase25ExternalRestorationRouter
} from "./routes/internal-post-phase25-external-restoration.js";
import {
  createInternalPostRemediationDegradedSmokeRouter
} from "./routes/internal-post-remediation-degraded-smoke.js";
import {
  createInternalPostStabilizationRuntimeInvestigationRouter
} from "./routes/internal-post-stabilization-runtime-investigation.js";
import {
  createInternalBrowserAccessRouter,
  createInternalBrowserAccessService,
  type InternalBrowserAccessService
} from "./routes/internal-browser-access.js";
import { createInternalHostPoolRouter } from "./routes/internal-host-pool.js";
import { createInternalObservabilityRouter } from "./routes/internal-observability.js";
import { createPublicChatRouter } from "./routes/public-chat.js";
import { createPublicOpenAiCompatibleRouter } from "./routes/public-openai-compatible.js";
import { createPublicRemoteRelayRouter } from "./routes/public-remote-relay.js";
import {
  createInternalRecoveryRouter
} from "./routes/internal-recovery.js";
import { createInternalPostRecoveryRegressionRouter } from "./routes/internal-post-recovery-regression.js";
import { createInternalReadinessRecoveryRouter } from "./routes/internal-readiness-recovery.js";
import { createInternalRolloutSmokeRouter } from "./routes/internal-rollout-smoke.js";
import { createInternalZeroReadyRootCauseRouter } from "./routes/internal-zero-ready-root-cause.js";
import { createInternalWorkerActionsRouter } from "./routes/internal-worker-actions.js";
import { createInternalWorkersRouter } from "./routes/internal-workers.js";
import { createPublicSessionsRouter } from "./routes/public-sessions.js";
import {
  createSessionService,
  type SessionService
} from "./sessions/session-service.js";
import type { SessionSnapshot } from "./sessions/session-types.js";
import { SessionStore } from "./sessions/session-store.js";
import { requireInternalAdmin } from "./security/internal-admin-guard.js";
import {
  createDockerEngineClient,
  type DockerEngineClient
} from "./workers/docker-engine-client.js";
import {
  createHostControllerClient,
  createNoopHostControllerClient,
  type HostControllerClient
} from "./workers/host-controller-client.js";
import {
  createHostPoolService,
  type HostPoolService
} from "./workers/host-pool-service.js";
import {
  createWorkerHealthMonitor,
  type WorkerHealthMonitor
} from "./workers/worker-health-monitor.js";
import {
  createWorkerRegistry,
  type WorkerRegistry
} from "./workers/worker-registry.js";
import {
  createRemoteRelayService,
  type RemoteRelayService
} from "./remote/remote-relay-service.js";

export interface ControlApiRuntime {
  config: ControlApiConfig;
  workerRegistry: WorkerRegistry;
  browserAccessService: InternalBrowserAccessService;
  sessionStore: SessionStore;
  sessionService: SessionService;
  chatBootstrapStore: ChatBootstrapStore;
  chatBootstrapService: ChatBootstrapService;
  chatStore: ChatStore;
  chatRelayService: ChatRelayService;
  operatorEventStore: OperatorEventStore;
  observabilityService: OperatorObservabilityService;
  remoteRelayService: RemoteRelayService;
  hostControllerClient: HostControllerClient;
  hostPoolService: HostPoolService;
  dockerEngineClient: DockerEngineClient;
  healthMonitor: WorkerHealthMonitor;
  dispose(): void;
}

export interface ControlApiRuntimeOptions {
  relayTransport?: ChatRelayTransport;
  bootstrapTransport?: ChatBootstrapTransport;
  hostControllerClient?: HostControllerClient;
  dockerEngineClient?: DockerEngineClient;
  healthMonitor?: WorkerHealthMonitor;
  findFallbackWorkerId?: () => Promise<string | null>;
  listFallbackWorkerIds?: () => Promise<string[]>;
}

export function createControlApiRuntime(
  config: ControlApiConfig = loadConfig(),
  options: ControlApiRuntimeOptions = {}
): ControlApiRuntime {
  const workerRegistry = createWorkerRegistry(config.workerDefinitions);
  const workerRelayClient = createWorkerRelayClient();
  const workerChatBootstrapClient = createWorkerChatBootstrapClient();
  const sessionStore = new SessionStore(config.sessionDatabasePath);
  const chatBootstrapStore = new ChatBootstrapStore(config.sessionDatabasePath);
  const operatorEventStore = new OperatorEventStore(config.sessionDatabasePath);
  const observabilityService = createOperatorObservabilityService({
    store: operatorEventStore,
    workerRegistry
  });
  const hostControllerClient =
    options.hostControllerClient ??
    (config.hostControllerBaseUrl
      ? createHostControllerClient(
          config.hostControllerBaseUrl,
          config.hostControllerToken
        )
      : createNoopHostControllerClient());
  let getChatBootstrapHandler: (
    sessionId: string
  ) => SessionChatBootstrapRecord | null = () => null;
  let scheduleChatBootstrapHandler: (
    snapshot: SessionSnapshot,
    now: Date
  ) => void = () => {};
  const sessionService = createSessionService({
    store: sessionStore,
    workerRegistry,
    sessionDurationMinutes: config.sessionDurationMinutes,
    sweepIntervalMs: config.sessionSweepIntervalMs,
    eventRecorder: observabilityService,
    getChatBootstrap(sessionId) {
      return getChatBootstrapHandler(sessionId);
    },
    onSessionActivated(snapshot, now) {
      scheduleChatBootstrapHandler(snapshot, now);
    }
  });
  const chatBootstrapService = createChatBootstrapService({
    store: chatBootstrapStore,
    sessionService,
    eventRecorder: observabilityService,
    transport:
      options.bootstrapTransport ??
      {
        async bootstrap(request) {
          const worker = workerRegistry.getWorker(request.workerId);

          if (!worker) {
            throw new Error(`Unknown worker for chat bootstrap: ${request.workerId}`);
          }

          return workerChatBootstrapClient.bootstrap(worker.agentBaseUrl, request);
        }
      }
  });
  getChatBootstrapHandler = (sessionId) => chatBootstrapService.getBootstrap(sessionId);
  scheduleChatBootstrapHandler = (snapshot, now) => {
    chatBootstrapService.scheduleBootstrapForSession(snapshot, now);
  };
  const chatStore = new ChatStore(config.sessionDatabasePath);
  const chatRelayService = createChatRelayService({
    chatStore,
    sessionService,
    chatBootstrapService,
    eventRecorder: observabilityService,
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
  const dockerEngineClient =
    options.dockerEngineClient ??
    createDockerEngineClient(config.dockerSocketPath);
  const healthMonitor =
    options.healthMonitor ??
    createWorkerHealthMonitor({
      workerRegistry,
      sessionService,
      pollIntervalMs: config.workerHealthPollIntervalMs,
      timeoutMs: config.workerHealthTimeoutMs,
      eventRecorder: observabilityService
    });
  const browserAccessService = createInternalBrowserAccessService({
    workerRegistry,
    sessionService,
    eventRecorder: observabilityService
  });
  const hostPoolService = createHostPoolService({
    hostControllerClient,
    workerRegistry
  });
  const remoteRelayService = createRemoteRelayService({
    serviceName: config.serviceName,
    requestTimeoutMs: config.remoteRelayRequestTimeoutMs ?? 180_000,
    topologyHint: config.remoteRelayTopologyHint ?? "pending",
    workerCount: config.workerDefinitions.length,
    defaultWorkerId: config.remoteRelayDefaultWorkerId,
    sessionService,
    chatRelayService,
    listFallbackWorkerIds:
      options.listFallbackWorkerIds ??
      (async () => {
        const availableWorkerIds: string[] = [];

        for (const worker of config.workerDefinitions) {
          if (sessionService.hasActiveSessionForWorker(worker.workerId)) {
            continue;
          }

          try {
            const response = await fetch(new URL("/health", `${worker.agentBaseUrl}/`), {
              signal: AbortSignal.timeout(config.workerHealthTimeoutMs)
            });

            if (!response.ok) {
              continue;
            }

            const payload = (await response.json()) as {
              runtimeStatus?: string;
              browserContextReady?: boolean;
            };

            if (
              payload.runtimeStatus === "ready" &&
              payload.browserContextReady === true
            ) {
              availableWorkerIds.push(worker.workerId);
            }
          } catch {
            // Ignore and keep scanning other workers.
          }
        }

        return availableWorkerIds;
      }),
    findFallbackWorkerId:
      options.findFallbackWorkerId ??
      (async () => {
        for (const worker of config.workerDefinitions) {
          if (sessionService.hasActiveSessionForWorker(worker.workerId)) {
            continue;
          }

          try {
            const response = await fetch(new URL("/health", `${worker.agentBaseUrl}/`), {
              signal: AbortSignal.timeout(config.workerHealthTimeoutMs)
            });

            if (!response.ok) {
              continue;
            }

            const payload = (await response.json()) as {
              runtimeStatus?: string;
              browserContextReady?: boolean;
            };

            if (
              payload.runtimeStatus === "ready" &&
              payload.browserContextReady === true
            ) {
              return worker.workerId;
            }
          } catch {
            // Ignore and keep scanning other workers.
          }
        }

        return null;
      })
  });

  sessionService.bootstrap();
  chatBootstrapService.scheduleBootstrapForActiveSessions();

  return {
    config,
    workerRegistry,
    browserAccessService,
    sessionStore,
    sessionService,
    chatBootstrapStore,
    chatBootstrapService,
    chatStore,
    chatRelayService,
    operatorEventStore,
    observabilityService,
    remoteRelayService,
    hostControllerClient,
    hostPoolService,
    dockerEngineClient,
    healthMonitor,
    dispose() {
      healthMonitor.stopHealthMonitor();
      chatRelayService.stopBackgroundRetrySweep();
      sessionService.close();
      chatStore.close();
      chatBootstrapStore.close();
      operatorEventStore.close();
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
    browserAccessService,
    sessionService,
    workerRegistry,
    chatRelayService,
    remoteRelayService,
    hostPoolService,
    dockerEngineClient,
    healthMonitor
  } = runtime;
  const app = express();
  const controlApiMode = config.mode ?? "full_app";

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use((_request, response, next) => {
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json());

  app.use(
    createHealthRouter({
      serviceName: config.serviceName,
      workerRegistry
    })
  );

  if (controlApiMode === "full_app") {
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
  }

  if (controlApiMode === "remote_relay") {
    if (!config.remoteRelayApiToken) {
      throw new Error(
        "REMOTE_RELAY_API_TOKEN is required when CONTROL_API_MODE=remote_relay"
      );
    }

    app.use(
      createPublicRemoteRelayRouter({
        remoteRelayService,
        apiToken: config.remoteRelayApiToken
      })
    );
    app.use(
      createPublicOpenAiCompatibleRouter({
        remoteRelayService,
        apiToken: config.remoteRelayApiToken
      })
    );
  }

  const internalAdminGuard = requireInternalAdmin({
    internalAdminToken: config.internalAdminToken
  });

  if (controlApiMode === "full_app") {
    app.use(
      internalAdminGuard,
      createInternalWorkersRouter({ workerRegistry }),
      createInternalBrowserAccessRouter({
        service: browserAccessService
      }),
      createInternalHostPoolRouter({
        hostPoolService
      }),
      createInternalObservabilityRouter({
        observabilityService: runtime.observabilityService
      }),
      createInternalReadinessRecoveryRouter({
        statePath: config.readinessRecoveryStatePath
      }),
      createInternalPostRecoveryRegressionRouter({
        statePath: config.postRecoveryRegressionStatePath
      }),
      createInternalZeroReadyRootCauseRouter({
        statePath: config.zeroReadyRootCauseStatePath
      }),
      createInternalDisconnectedBaselineRemediationRouter({
        statePath: config.disconnectedBaselineRemediationStatePath
      }),
      createInternalDisconnectedRuntimeRemediationRouter({
        statePath: config.disconnectedRuntimeRemediationStatePath
      }),
      createInternalPersistentDisconnectedRuntimeFollowupRouter({
        statePath: config.persistentDisconnectedRuntimeFollowupStatePath
      }),
      createInternalRuntimeParityBackportRemediationRouter({
        statePath: config.runtimeParityBackportRemediationStatePath
      }),
      createInternalPostParityDisconnectedRuntimeRemediationRouter({
        statePath: config.postParityDisconnectedRuntimeRemediationStatePath
      }),
      createInternalPostPhase21DisconnectedRuntimeFollowupRouter({
        statePath: config.postPhase21DisconnectedRuntimeFollowupStatePath
      }),
      createInternalPostPhase22SmokeWrapperParityRemediationRouter({
        statePath: config.postPhase22SmokeWrapperParityRemediationStatePath
      }),
      createInternalPostPhase23ExactSmokeWrapperCompatRemediationRouter({
        statePath: config.postPhase23ExactSmokeWrapperCompatRemediationStatePath
      }),
      createInternalPostPhase24ExternalApiReadinessRouter({
        statePath: config.postPhase24ExternalApiReadinessStatePath
      }),
      createInternalPostPhase25ExternalRestorationRouter({
        statePath: config.postPhase25ExternalRestorationStatePath
      }),
      createInternalPostRemediationDegradedSmokeRouter({
        statePath: config.postRemediationDegradedSmokeStatePath
      }),
      createInternalPostStabilizationRuntimeInvestigationRouter({
        statePath: config.postStabilizationRuntimeInvestigationStatePath
      }),
      createInternalRolloutSmokeRouter({
        statePath: config.rolloutSmokeStatePath
      }),
      createInternalAdminPageRouter()
    );
    app.get("/internal/bootstrap", internalAdminGuard, (_request, response) => {
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
      internalAdminGuard,
      createInternalRecoveryRouter({
        browserAccessService
      }),
      createInternalWorkerActionsRouter({
        workerRegistry,
        sessionService,
        dockerEngineClient,
        hostControllerClient: runtime.hostControllerClient,
        healthMonitor,
        eventRecorder: runtime.observabilityService
      })
    );

    registerSessionClientRoutes(app, runtime);
  }

  return app;
}

export async function startControlApi(
  config: ControlApiConfig = loadConfig()
) {
  const runtime = createControlApiRuntime(config);
  runtime.sessionService.startBackgroundSweep();
  runtime.chatRelayService.startBackgroundRetrySweep(
    config.sessionSweepIntervalMs
  );
  runtime.healthMonitor.startHealthMonitor();
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
