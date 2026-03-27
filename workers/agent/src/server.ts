import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

import express from "express";

export interface WorkerAgentConfig {
  workerId: string;
  displayName: string;
  containerName: string;
  host: string;
  port: number;
  profilePath: string;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
      `/srv/chatgpt-workers/profiles/${workerId}`
  };
}

export function createWorkerAgentApp(
  config: WorkerAgentConfig = loadWorkerAgentConfig()
) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({
      service: "worker-agent",
      workerId: config.workerId,
      containerName: config.containerName,
      profilePath: config.profilePath,
      status: "starting"
    });
  });

  app.get("/internal/worker", (_request, response) => {
    response.json({
      workerId: config.workerId,
      displayName: config.displayName,
      containerName: config.containerName,
      profilePath: config.profilePath
    });
  });

  return app;
}

async function startWorkerAgent(config: WorkerAgentConfig = loadWorkerAgentConfig()) {
  const app = createWorkerAgentApp(config);

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
