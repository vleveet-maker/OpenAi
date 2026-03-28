import test from "node:test";
import assert from "node:assert/strict";

import { createHostControllerServer } from "../src/server.mjs";

function withServer(controller, run) {
  return new Promise((resolve, reject) => {
    const server = createHostControllerServer(
      {
        authToken: "secret"
      },
      controller
    );

    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        await run(baseUrl);
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      } catch (error) {
        server.close(() => {
          reject(error);
        });
      }
    });
  });
}

test("GET /health returns proxyListening, poolStatus, proxyServerUrl, and workers", async () => {
  await withServer(
    {
      async getHealthSnapshot() {
        return {
          proxyListening: true,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "ready",
          workers: [
            {
              workerId: "dad",
              agentListening: true,
              browserListening: true
            }
          ]
        };
      }
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`, {
        headers: {
          "x-host-controller-token": "secret"
        }
      });

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.equal(body.status, "ok");
      assert.equal(body.proxyListening, true);
      assert.equal(body.proxyServerUrl, "http://127.0.0.1:7897");
      assert.equal(body.poolStatus, "ready");
      assert.equal(body.workers.length, 1);
    }
  );
});

test("GET /workers returns current worker inventory plus pool metadata", async () => {
  await withServer(
    {
      async getHealthSnapshot() {
        return {
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: [
            {
              workerId: "dad",
              agentListening: false,
              browserListening: false
            }
          ]
        };
      }
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/workers`, {
        headers: {
          "x-host-controller-token": "secret"
        }
      });

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.equal(body.proxyListening, false);
      assert.equal(body.poolStatus, "idle");
      assert.equal(body.proxyServerUrl, "http://127.0.0.1:7897");
      assert.equal(body.workers[0].workerId, "dad");
    }
  );
});

test("POST /pool/start and POST /pool/stop return structured lifecycle payloads", async () => {
  const calls = [];

  await withServer(
    {
      async startPool() {
        calls.push("start");
        return {
          action: "pool_start_requested",
          proxyListening: true,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "degraded",
          workers: [{ workerId: "dad", status: "start_requested" }]
        };
      },
      async stopPool() {
        calls.push("stop");
        return {
          action: "pool_stop_requested",
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: [{ workerId: "dad", status: "stop_requested" }]
        };
      }
    },
    async (baseUrl) => {
      const startResponse = await fetch(`${baseUrl}/pool/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-controller-token": "secret"
        },
        body: "{}"
      });
      assert.equal(startResponse.status, 202);
      const startBody = await startResponse.json();
      assert.equal(startBody.action, "pool_start_requested");
      assert.equal(startBody.poolStatus, "degraded");
      assert.equal(startBody.proxyListening, true);
      assert.equal(startBody.proxyServerUrl, "http://127.0.0.1:7897");

      const stopResponse = await fetch(`${baseUrl}/pool/stop`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-controller-token": "secret"
        },
        body: "{}"
      });
      assert.equal(stopResponse.status, 202);
      const stopBody = await stopResponse.json();
      assert.equal(stopBody.action, "pool_stop_requested");
      assert.equal(stopBody.poolStatus, "idle");
      assert.equal(stopBody.proxyListening, false);
      assert.equal(stopBody.proxyServerUrl, "http://127.0.0.1:7897");

      assert.deepEqual(calls, ["start", "stop"]);
    }
  );
});
