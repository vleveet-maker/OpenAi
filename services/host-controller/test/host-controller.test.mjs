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
