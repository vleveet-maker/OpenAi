import http from "node:http";
import { pathToFileURL } from "node:url";

import { loadHostControllerConfig } from "./config.mjs";
import { HostController } from "./host-controller.mjs";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function matchWorkerAction(pathname) {
  const match = pathname.match(
    /^\/workers\/([^/]+)\/(start|stop|validate-alternate-desktop)$/
  );

  if (!match) {
    return null;
  }

  return {
    workerId: decodeURIComponent(match[1]),
    action: match[2]
  };
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseStartWorkerOptionsFromBody(rawBody, fallback = {}) {
  if (!rawBody || rawBody.trim().length === 0) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawBody);
    return {
      runtimeMode:
        typeof parsed?.runtimeMode === "string"
          ? parsed.runtimeMode
          : fallback.runtimeMode,
      profileStrategy:
        typeof parsed?.profileStrategy === "string"
          ? parsed.profileStrategy
          : fallback.profileStrategy,
      browserWindowMode:
        typeof parsed?.browserWindowMode === "string"
          ? parsed.browserWindowMode
          : fallback.browserWindowMode
    };
  } catch {
    return fallback;
  }
}

export function createHostControllerServer(
  config = loadHostControllerConfig(),
  controller = new HostController(config)
) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (request.headers["x-host-controller-token"] !== config.authToken) {
        sendJson(response, 403, {
          error: "host_controller_forbidden"
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        const health = await controller.getHealthSnapshot();
        sendJson(response, 200, {
          service: "host-controller",
          status: "ok",
          ...health
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/workers") {
        const health = await controller.getHealthSnapshot();
        sendJson(response, 200, {
          proxyListening: health.proxyListening,
          proxyServerUrl: health.proxyServerUrl,
          poolStatus: health.poolStatus,
          workers: health.workers
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/pool/start") {
        const body = await readRequestBody(request);
        const startOptions = parseStartWorkerOptionsFromBody(body);
        const result = await controller.startPool(
          startOptions.runtimeMode,
          startOptions.browserWindowMode
        );
        sendJson(response, 202, {
          ...result,
          workers: result.workers.map((worker) => ({
            ...worker,
            startupStatus: worker.startupStatus ?? worker.status ?? null
          }))
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/pool/stop") {
        await readRequestBody(request);
        const result = await controller.stopPool();
        sendJson(response, 202, result);
        return;
      }

      const workerAction = matchWorkerAction(url.pathname);

      if (request.method === "POST" && workerAction) {
        const body = await readRequestBody(request);

        if (workerAction.action === "start") {
          const startOptions = parseStartWorkerOptionsFromBody(body);
          const result = await controller.startWorker(
            workerAction.workerId,
            startOptions.runtimeMode,
            startOptions.profileStrategy,
            startOptions.browserWindowMode
          );
          sendJson(
            response,
            202,
            {
              ...result,
              startupStatus: result.startupStatus ?? result.status ?? null
            }
          );
          return;
        }

        if (workerAction.action === "stop") {
          sendJson(response, 202, await controller.stopWorker(workerAction.workerId));
          return;
        }

        if (workerAction.action === "validate-alternate-desktop") {
          sendJson(
            response,
            202,
            await controller.validateAlternateDesktop(workerAction.workerId)
          );
          return;
        }
      }

      sendJson(response, 404, {
        error: "host_controller_route_not_found",
        path: url.pathname
      });
    } catch (error) {
      sendJson(response, 500, {
        error: "host_controller_error",
        detail: error instanceof Error ? error.message : "unknown host controller error"
      });
    }
  });
}

async function main() {
  const config = loadHostControllerConfig();
  const controller = new HostController(config);
  const server = createHostControllerServer(config, controller);

  server.listen(config.port, config.host, () => {
    console.log(`[host-controller] listening on ${config.host}:${config.port}`);
  });
}

const isMainModule =
  !process.argv.includes("--test") &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  void main();
}
