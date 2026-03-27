import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

import express from "express";

import { loadConfig, type ControlApiConfig } from "./config.js";
import { createInternalHealthRouter } from "./routes/internal-health.js";
import {
  createInternalRecoveryRouter,
  type InternalRecoverySession
} from "./routes/internal-recovery.js";
import { createInternalWorkerActionsRouter } from "./routes/internal-worker-actions.js";
import { createInternalWorkersRouter } from "./routes/internal-workers.js";
import { requireInternalAdmin } from "./security/internal-admin-guard.js";
import {
  createWorkerRegistry,
  type WorkerRegistry
} from "./workers/worker-registry.js";

export interface ControlApiRuntime {
  config: ControlApiConfig;
  workerRegistry: WorkerRegistry;
  recoverySessions: Map<string, InternalRecoverySession>;
}

export function createControlApiRuntime(
  config: ControlApiConfig = loadConfig()
): ControlApiRuntime {
  return {
    config,
    workerRegistry: createWorkerRegistry(config.workerDefinitions),
    recoverySessions: new Map<string, InternalRecoverySession>()
  };
}

export function createControlApiApp(
  runtime: ControlApiRuntime = createControlApiRuntime()
) {
  const { config, recoverySessions, workerRegistry } = runtime;
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

  const internalAdminGuard = requireInternalAdmin({
    internalAdminToken: config.internalAdminToken,
    allowPrivateNetworks: true
  });

  app.use(internalAdminGuard, createInternalWorkersRouter({ workerRegistry }));
  app.use(
    internalAdminGuard,
    createInternalRecoveryRouter({
      workerRegistry,
      recoverySessions
    }),
    createInternalWorkerActionsRouter({
      workerRegistry
    })
  );

  return app;
}

export async function startControlApi(
  config: ControlApiConfig = loadConfig()
) {
  const app = createControlApiApp(createControlApiRuntime(config));

  return new Promise<import("node:http").Server>((resolve) => {
    const server = app.listen(config.port, config.host, () => {
      resolve(server);
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
