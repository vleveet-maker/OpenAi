import http from "node:http";

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
  const match = pathname.match(/^\/workers\/([^/]+)\/(start|stop)$/);

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

async function main() {
  const config = loadHostControllerConfig();
  const controller = new HostController(config);

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (request.headers["x-host-controller-token"] !== config.authToken) {
        sendJson(response, 403, {
          error: "host_controller_forbidden"
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        const workers = await controller.getWorkerStatuses();
        sendJson(response, 200, {
          service: "host-controller",
          status: "ok",
          workers
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/workers") {
        const workers = await controller.getWorkerStatuses();
        sendJson(response, 200, {
          workers
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/pool/start") {
        await readRequestBody(request);
        const result = await controller.startPool();
        sendJson(response, 202, result);
        return;
      }

      const workerAction = matchWorkerAction(url.pathname);

      if (request.method === "POST" && workerAction) {
        await readRequestBody(request);

        if (workerAction.action === "start") {
          sendJson(response, 202, await controller.startWorker(workerAction.workerId));
          return;
        }

        if (workerAction.action === "stop") {
          sendJson(response, 202, await controller.stopWorker(workerAction.workerId));
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

  server.listen(config.port, config.host, () => {
    console.log(`[host-controller] listening on ${config.host}:${config.port}`);
  });
}

void main();
