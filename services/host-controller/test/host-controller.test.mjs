import test from "node:test";
import assert from "node:assert/strict";

import { HostController } from "../src/host-controller.mjs";

function createConfig() {
  return {
    proxyListenHost: "127.0.0.1",
    proxyMixedPort: 7897,
    proxyServerUrl: "http://127.0.0.1:7897",
    defaultWorkerRuntimeMode: "hidden_runtime",
    workers: [
      {
        workerId: "dad",
        displayName: "Dad",
        agentPort: 4021,
        cdpPort: 9222,
        profilePath: "dad-profile",
        startScriptPath: "start-dad.ps1"
      },
      {
        workerId: "wife",
        displayName: "Wife",
        agentPort: 4022,
        cdpPort: 9223,
        profilePath: "wife-profile",
        startScriptPath: "start-wife.ps1"
      }
    ]
  };
}

test("getObservedPoolStatus returns ready when proxy and all workers are reachable", () => {
  const controller = new HostController(createConfig());

  const status = controller.getObservedPoolStatus(true, [
    {
      workerId: "dad",
      agentListening: true,
      browserListening: true
    },
    {
      workerId: "wife",
      agentListening: true,
      browserListening: true
    }
  ]);

  assert.equal(status, "ready");
});

test("getObservedPoolStatus returns idle when proxy and workers are all down", () => {
  const controller = new HostController(createConfig());

  const status = controller.getObservedPoolStatus(false, [
    {
      workerId: "dad",
      agentListening: false,
      browserListening: false
    },
    {
      workerId: "wife",
      agentListening: false,
      browserListening: false
    }
  ]);

  assert.equal(status, "idle");
});

test("getObservedPoolStatus returns degraded when only part of the pool is reachable", () => {
  const controller = new HostController(createConfig());

  const status = controller.getObservedPoolStatus(true, [
    {
      workerId: "dad",
      agentListening: true,
      browserListening: true
    },
    {
      workerId: "wife",
      agentListening: false,
      browserListening: false
    }
  ]);

  assert.equal(status, "degraded");
});

test("stopPool returns pool_stop_requested and stops proxy after worker shutdowns", async () => {
  const controller = new HostController(createConfig());
  const sequence = [];

  controller.stopWorker = async (workerId) => {
    sequence.push(`worker:${workerId}`);
    return {
      workerId,
      status: "stop_requested"
    };
  };
  controller.stopProxyRuntime = async () => {
    sequence.push("proxy");
    return {
      status: "stop_requested",
      listenPort: 7897
    };
  };
  controller.getHealthSnapshot = async () => ({
    proxyListening: false,
    proxyServerUrl: "http://127.0.0.1:7897",
    poolStatus: "idle",
    workers: []
  });

  const result = await controller.stopPool();

  assert.equal(result.action, "pool_stop_requested");
  assert.equal(result.proxyAction, "stop_requested");
  assert.equal(result.poolStatus, "idle");
  assert.deepEqual(
    result.workers,
    [
      { workerId: "dad", status: "stop_requested" },
      { workerId: "wife", status: "stop_requested" }
    ]
  );
  assert.deepEqual(sequence, ["worker:dad", "worker:wife", "proxy"]);
});

test("startPool requests hidden_runtime for each configured worker by default", async () => {
  const controller = new HostController(createConfig());
  const calls = [];

  controller.startWorker = async (workerId, runtimeMode) => {
    calls.push({
      workerId,
      runtimeMode
    });

    return {
      workerId,
      status: "start_requested",
      runtimeMode
    };
  };
  controller.getHealthSnapshot = async () => ({
    proxyListening: true,
    proxyServerUrl: "http://127.0.0.1:7897",
    poolStatus: "ready",
    workers: []
  });

  const result = await controller.startPool();

  assert.equal(result.action, "pool_start_requested");
  assert.equal(result.runtimeMode, "hidden_runtime");
  assert.deepEqual(calls, [
    {
      workerId: "dad",
      runtimeMode: "hidden_runtime"
    },
    {
      workerId: "wife",
      runtimeMode: "hidden_runtime"
    }
  ]);
});

test("startWorker returns already_running when health JSON is already reachable", async () => {
  const controller = new HostController(createConfig());

  controller.ensureProxyReady = async () => ({
    listenHost: "127.0.0.1",
    listenPort: 7897,
    proxyServerUrl: "http://127.0.0.1:7897"
  });
  controller.getWorkerStatus = async (_worker, runtimeModeFallback) => ({
    workerId: "dad",
    displayName: "Dad",
    agentPort: 4021,
    cdpPort: 9222,
    proxyServer: "http://127.0.0.1:7897",
    agentListening: true,
    browserListening: true,
    runtimeMode: runtimeModeFallback,
    headless: true,
    cdpAttached: false,
    proxyServerConfigured: true,
    runtimeStatus: "ready"
  });
  controller.requestWorkerStart = async () => {
    throw new Error("should_not_start_process");
  };

  const result = await controller.startWorker("dad", "hidden_runtime");

  assert.equal(result.status, "already_running");
  assert.equal(result.startupStatus, "already_running");
  assert.equal(result.runtimeMode, "hidden_runtime");
  assert.equal(result.agentListening, true);
  assert.equal(result.browserListening, true);
  assert.equal(result.runtimeStatus, "ready");
});

test("startWorker returns startup_timeout when the agent never becomes health-reachable", async () => {
  const controller = new HostController(createConfig());
  let checks = 0;

  controller.ensureProxyReady = async () => ({
    listenHost: "127.0.0.1",
    listenPort: 7897,
    proxyServerUrl: "http://127.0.0.1:7897"
  });
  controller.requestWorkerStart = async () => {};
  controller.getWorkerStatus = async (_worker, runtimeModeFallback) => {
    checks += 1;

    return {
      workerId: "dad",
      displayName: "Dad",
      agentPort: 4021,
      cdpPort: 9222,
      proxyServer: "http://127.0.0.1:7897",
      agentListening: checks > 1,
      browserListening: false,
      runtimeMode: runtimeModeFallback,
      headless: true,
      cdpAttached: false,
      proxyServerConfigured: true,
      runtimeStatus: null
    };
  };

  const result = await controller.observeWorkerStartup(
    controller.requireWorker("dad"),
    "hidden_runtime",
    5,
    0
  );

  assert.equal(result.status, "startup_timeout");
  assert.equal(result.startupStatus, "startup_timeout");
  assert.equal(result.runtimeMode, "hidden_runtime");
  assert.equal(result.agentListening, true);
  assert.equal(result.runtimeStatus, null);
});

test("startPool aggregates per-worker startupStatus and fresh poolStatus", async () => {
  const controller = new HostController(createConfig());
  const calls = [];

  controller.startWorker = async (workerId, runtimeMode) => {
    calls.push({ workerId, runtimeMode });

    return {
      workerId,
      status: workerId === "dad" ? "started" : "startup_timeout",
      startupStatus: workerId === "dad" ? "started" : "startup_timeout",
      runtimeMode,
      agentListening: true,
      browserListening: workerId === "dad",
      runtimeStatus: workerId === "dad" ? "ready" : null
    };
  };
  controller.getHealthSnapshot = async () => ({
    proxyListening: true,
    proxyServerUrl: "http://127.0.0.1:7897",
    poolStatus: "degraded",
    workers: [
      {
        workerId: "dad",
        agentListening: true,
        browserListening: true
      },
      {
        workerId: "wife",
        agentListening: true,
        browserListening: false
      }
    ]
  });

  const result = await controller.startPool();

  assert.equal(result.action, "pool_start_requested");
  assert.equal(result.poolStatus, "degraded");
  assert.equal(result.workers[0].startupStatus, "started");
  assert.equal(result.workers[1].startupStatus, "startup_timeout");
  assert.deepEqual(calls, [
    { workerId: "dad", runtimeMode: "hidden_runtime" },
    { workerId: "wife", runtimeMode: "hidden_runtime" }
  ]);
});
