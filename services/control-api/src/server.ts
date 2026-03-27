import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

import express from "express";

import { loadConfig, type ControlApiConfig } from "./config.js";

export function createControlApiApp(
  config: ControlApiConfig = loadConfig()
) {
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

  return app;
}

export async function startControlApi(
  config: ControlApiConfig = loadConfig()
) {
  const app = createControlApiApp(config);

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
