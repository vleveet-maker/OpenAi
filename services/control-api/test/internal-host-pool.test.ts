import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import type {
  HostControllerClient,
  HostControllerHealthSnapshot
} from "../src/workers/host-controller-client.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createConfig(root: string): ControlApiConfig {
  return {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    hostControllerBaseUrl: "http://host-controller.local",
    hostControllerToken: "host-secret",
    autoStartHostWorkers: false,
    sessionDatabasePath: join(root, "session-routing.sqlite"),
    sessionDurationMinutes: 60,
    sessionSweepIntervalMs: 5_000,
    sessionClientDistPath: join(root, "missing-client-dist"),
    dockerSocketPath: "/var/run/docker.sock",
    workerHealthPollIntervalMs: 5_000,
    workerHealthTimeoutMs: 3_000,
    workerDefinitions: [
      {
        workerId: "dad",
        displayName: "Dad",
        containerName: "host-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl: "http://host.docker.internal:4021",
        runtimeType: "host",
        defaultStatus: "disconnected"
      }
    ]
  };
}

function createTestRuntime(hostControllerClient: HostControllerClient) {
  const root = mkdtempSync(join(tmpdir(), "control-api-host-pool-"));
  tempDirectories.push(root);

  const runtime = createControlApiRuntime(createConfig(root), {
    hostControllerClient,
    bootstrapTransport: createReadyBootstrapTransport()
  });

  return {
    runtime,
    app: createControlApiApp(runtime)
  };
}

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }

  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, {
        force: true,
        recursive: true
      });
    }
  }
});

describe("internal host pool routes", () => {
  it("returns idle or degraded snapshots with proxyListening and workers", async () => {
    let health: HostControllerHealthSnapshot = {
      proxyListening: false,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "idle",
      workers: [
        {
          workerId: "dad",
          displayName: "Dad",
          agentListening: false,
          browserListening: false
        }
      ]
    };

    const { app, runtime } = createTestRuntime({
      async startWorker() {},
      async stopWorker() {},
      async startPool() {
        return {
          action: "pool_start_requested",
          ...health
        };
      },
      async stopPool() {
        return {
          action: "pool_stop_requested",
          ...health
        };
      },
      async getHealth() {
        return health;
      },
      async listWorkers() {
        return health;
      }
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const idleResponse = await request(app)
      .get("/internal/host-pool")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(idleResponse.body.pool.status).toBe("idle");
    expect(idleResponse.body.pool.proxyListening).toBe(false);
    expect(idleResponse.body.pool.routineRuntimeMode).toBe("visible_auth");
    expect(idleResponse.body.pool.routineRuntimeClass).toBe("host_visible_compact");
    expect(idleResponse.body.pool.routineBrowserWindowMode).toBe("CompactCorner");
    expect(idleResponse.body.pool.workers[0].workerId).toBe("dad");
    expect(idleResponse.body.pool.workers[0].runtimeCapability).toBe("unreachable");

    health = {
      proxyListening: true,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "degraded",
      workers: [
        {
          workerId: "dad",
          displayName: "Dad",
          agentListening: true,
          browserListening: false
        }
      ]
    };

    const degradedResponse = await request(app)
      .get("/internal/host-pool")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(degradedResponse.body.pool.status).toBe("degraded");
    expect(degradedResponse.body.pool.proxyListening).toBe(true);
    expect(degradedResponse.body.pool.workers[0].runtimeCapability).toBe("reachable_but_unusable");
  });

  it("returns 202 for start and stop and reflects ready then idle states", async () => {
    const startCalls: Array<Record<string, unknown>> = [];
    let health: HostControllerHealthSnapshot = {
      proxyListening: false,
      proxyServerUrl: "http://127.0.0.1:7897",
      poolStatus: "idle",
      workers: [
        {
          workerId: "dad",
          displayName: "Dad",
          agentListening: false,
          browserListening: false
        }
      ]
    };

    const { app, runtime } = createTestRuntime({
      async startWorker() {},
      async stopWorker() {},
      async startPool(runtimeMode, browserWindowMode) {
        startCalls.push({
          runtimeMode,
          browserWindowMode
        });
        health = {
          proxyListening: true,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "ready",
          workers: [
            {
              workerId: "dad",
              displayName: "Dad",
              agentListening: true,
              browserListening: true
            }
          ]
        };

        return {
          action: "pool_start_requested",
          ...health
        };
      },
      async stopPool() {
        health = {
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: [
            {
              workerId: "dad",
              displayName: "Dad",
              agentListening: false,
              browserListening: false
            }
          ]
        };

        return {
          action: "pool_stop_requested",
          ...health
        };
      },
      async getHealth() {
        return health;
      },
      async listWorkers() {
        return health;
      }
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const startResponse = await request(app)
      .post("/internal/host-pool/start")
      .set("x-internal-admin-token", "secret")
      .send({
        runtimeMode: "visible_auth",
        browserWindowMode: "CompactCorner"
      })
      .expect(202);

    expect(startResponse.body.action).toBe("start_requested");
    expect(startResponse.body.pool.status).toBe("ready");
    expect(startResponse.body.pool.proxyListening).toBe(true);
    expect(startResponse.body.pool.routineRuntimeClass).toBe("host_visible_compact");
    expect(startResponse.body.pool.routineBrowserWindowMode).toBe("CompactCorner");
    expect(startResponse.body.pool.workers[0].runtimeCapability).toBe("reachable_but_unusable");
    expect(startCalls).toEqual([
      {
        runtimeMode: "visible_auth",
        browserWindowMode: "CompactCorner"
      }
    ]);

    const stopResponse = await request(app)
      .post("/internal/host-pool/stop")
      .set("x-internal-admin-token", "secret")
      .send({})
      .expect(202);

    expect(stopResponse.body.action).toBe("stop_requested");
    expect(stopResponse.body.pool.status).toBe("idle");
    expect(stopResponse.body.pool.proxyListening).toBe(false);
    expect(stopResponse.body.pool.workers[0].runtimeCapability).toBe("unreachable");
  });

  it("rejects concurrent actions with host_pool_busy", async () => {
    let releaseStart!: () => void;

    const { app, runtime } = createTestRuntime({
      async startWorker() {},
      async stopWorker() {},
      async startPool() {
        await new Promise<void>((resolve) => {
          releaseStart = resolve;
        });

        return {
          action: "pool_start_requested",
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      },
      async stopPool() {
        return {
          action: "pool_stop_requested",
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      },
      async getHealth() {
        return {
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      },
      async listWorkers() {
        return {
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      }
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const firstRequest = request(app)
      .post("/internal/host-pool/start")
      .set("x-internal-admin-token", "secret")
      .send({});
    const firstRequestPromise = firstRequest.then((response) => response);

    while (!releaseStart) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const secondResponse = await request(app)
      .post("/internal/host-pool/start")
      .set("x-internal-admin-token", "secret")
      .send({})
      .expect(409);

    expect(secondResponse.body.error).toBe("host_pool_busy");

    releaseStart();
    const firstResponse = await firstRequestPromise;
    expect(firstResponse.status).toBe(202);
  });

  it("returns to truthful idle state after a failed action if controller health recovers", async () => {
    const { app, runtime } = createTestRuntime({
      async startWorker() {},
      async stopWorker() {},
      async startPool() {
        throw new Error("controller offline");
      },
      async stopPool() {
        return {
          action: "pool_stop_requested",
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      },
      async getHealth() {
        return {
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      },
      async listWorkers() {
        return {
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      }
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const failureResponse = await request(app)
      .post("/internal/host-pool/start")
      .set("x-internal-admin-token", "secret")
      .send({})
      .expect(502);

    expect(failureResponse.body.error).toBe("host_pool_start_failed");

    const snapshotResponse = await request(app)
      .get("/internal/host-pool")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(snapshotResponse.body.pool.status).toBe("idle");
    expect(snapshotResponse.body.pool.lastError).toBeNull();
  });

  it("preserves controller worker rows instead of collapsing workers to empty while reachable", async () => {
    let callCount = 0;

    const { app, runtime } = createTestRuntime({
      async startWorker() {},
      async stopWorker() {},
      async startPool() {
        return {
          action: "pool_start_requested",
          proxyListening: true,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "degraded",
          workers: [
            {
              workerId: "dad",
              displayName: "Dad",
              agentListening: true,
              browserListening: false
            }
          ]
        };
      },
      async stopPool() {
        return {
          action: "pool_stop_requested",
          proxyListening: false,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "idle",
          workers: []
        };
      },
      async getHealth() {
        callCount += 1;

        return callCount === 1
          ? {
              proxyListening: true,
              proxyServerUrl: "http://127.0.0.1:7897",
              poolStatus: "degraded",
              workers: [
                {
                  workerId: "dad",
                  displayName: "Dad",
                  agentListening: true,
                  browserListening: false
                }
              ]
            }
          : {
              proxyListening: true,
              proxyServerUrl: "http://127.0.0.1:7897",
              poolStatus: "idle",
              workers: []
            };
      },
      async listWorkers() {
        return {
          proxyListening: true,
          proxyServerUrl: "http://127.0.0.1:7897",
          poolStatus: "degraded",
          workers: []
        };
      }
    });
    cleanupCallbacks.push(() => runtime.dispose());

    await request(app)
      .get("/internal/host-pool")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    const secondResponse = await request(app)
      .get("/internal/host-pool")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(secondResponse.body.pool.controllerReachable).toBe(true);
    expect(secondResponse.body.pool.workers).toHaveLength(1);
    expect(secondResponse.body.pool.workers[0].workerId).toBe("dad");
  });
});
