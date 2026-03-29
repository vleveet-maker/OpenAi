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
      async startPool(runtimeMode) {
        calls.push({
          action: "start",
          runtimeMode
        });
        return {
          action: "pool_start_requested",
          runtimeMode: runtimeMode ?? "alternate_desktop",
          proxyListening: true,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "degraded",
          workers: [{
            workerId: "dad",
            status: "started",
            startupStatus: "started",
            runtimeMode: runtimeMode ?? "alternate_desktop",
            agentListening: true,
            browserListening: false,
            runtimeStatus: "starting"
          }]
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
        body: JSON.stringify({
          runtimeMode: "alternate_desktop"
        })
      });
      assert.equal(startResponse.status, 202);
      const startBody = await startResponse.json();
      assert.equal(startBody.action, "pool_start_requested");
      assert.equal(startBody.runtimeMode, "alternate_desktop");
      assert.equal(startBody.poolStatus, "degraded");
      assert.equal(startBody.proxyListening, true);
      assert.equal(startBody.proxyServerUrl, "http://127.0.0.1:7897");
      assert.equal(startBody.workers[0].startupStatus, "started");

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

      assert.deepEqual(calls, [{
        action: "start",
        runtimeMode: "alternate_desktop"
      }, "stop"]);
    }
  );
});

test("POST /workers/:id/start forwards explicit runtimeMode", async () => {
  const calls = [];

  await withServer(
    {
      async startWorker(workerId, runtimeMode) {
        calls.push({
          workerId,
          runtimeMode
        });

        return {
          workerId,
          status: "started",
          startupStatus: "started",
          runtimeMode,
          agentListening: true,
          browserListening: true,
          runtimeStatus: "ready"
        };
      }
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/workers/dad/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-controller-token": "secret"
        },
        body: JSON.stringify({
          runtimeMode: "visible_auth"
        })
      });

      assert.equal(response.status, 202);
      const body = await response.json();
      assert.equal(body.workerId, "dad");
      assert.equal(body.runtimeMode, "visible_auth");
      assert.equal(body.startupStatus, "started");
      assert.deepEqual(calls, [{
        workerId: "dad",
        runtimeMode: "visible_auth"
      }]);
    }
  );
});

test("POST /workers/:id/start exposes startup_timeout when startup never reaches health JSON", async () => {
  await withServer(
    {
      async startWorker(workerId, runtimeMode) {
        return {
          workerId,
          status: "startup_timeout",
          startupStatus: "startup_timeout",
          runtimeMode,
          agentListening: true,
          browserListening: false,
          runtimeStatus: null
        };
      }
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/workers/dad/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-controller-token": "secret"
        },
        body: JSON.stringify({
          runtimeMode: "alternate_desktop"
        })
      });

      assert.equal(response.status, 202);
      const body = await response.json();
      assert.equal(body.startupStatus, "startup_timeout");
      assert.equal(body.runtimeStatus, null);
      assert.equal(body.agentListening, true);
    }
  );
});

test("POST /workers/:id/validate-alternate-desktop forwards validation results", async () => {
  const calls = [];

  await withServer(
    {
      async validateAlternateDesktop(workerId) {
        calls.push(workerId);

        return {
          workerId,
          runtimeClass: "host_alternate_desktop",
          runtimeMode: "alternate_desktop",
          result: "alternate_desktop_usable",
          phase11Ready: true,
          validationPending: false,
          proofFailureClass: null,
          pageUrl: "https://chatgpt.com/",
          bootstrapFailureCode: null,
          bootstrapStep: "complete",
          relayFailureCode: null,
          checkedAt: "2026-03-29T03:55:00.000Z",
          runtimeDesktopName: "CodexWorker-dad",
          detail: null
        };
      }
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/workers/dad/validate-alternate-desktop`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-controller-token": "secret"
        },
        body: "{}"
      });

      assert.equal(response.status, 202);

      const body = await response.json();
      assert.equal(body.workerId, "dad");
      assert.equal(body.phase11Ready, true);
      assert.equal(body.runtimeMode, "alternate_desktop");
      assert.deepEqual(calls, ["dad"]);
    }
  );
});
