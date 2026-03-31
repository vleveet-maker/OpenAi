import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { HostController } from "../src/host-controller.mjs";

function createConfig() {
  return {
    repoRoot: join(tmpdir(), "owmcgp-host-controller-test"),
    proxyListenHost: "127.0.0.1",
    proxyMixedPort: 7897,
    proxyServerUrl: "http://127.0.0.1:7897",
    defaultWorkerRuntimeMode: "visible_auth",
    browserWindowMode: "CompactCorner",
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
      },
      {
        workerId: "shared-1",
        displayName: "Shared 1",
        agentPort: 4023,
        cdpPort: 9224,
        profilePath: "shared-1-profile",
        startScriptPath: "start-shared-1.ps1"
      },
      {
        workerId: "shared-2",
        displayName: "Shared 2",
        agentPort: 4024,
        cdpPort: 9225,
        profilePath: "shared-2-profile",
        startScriptPath: "start-shared-2.ps1"
      },
      {
        workerId: "shared-3",
        displayName: "Shared 3",
        agentPort: 4025,
        cdpPort: 9226,
        profilePath: "shared-3-profile",
        startScriptPath: "start-shared-3.ps1"
      },
      {
        workerId: "shared-4",
        displayName: "Shared 4",
        agentPort: 4026,
        cdpPort: 9227,
        profilePath: "shared-4-profile",
        startScriptPath: "start-shared-4.ps1"
      },
      {
        workerId: "shared-5",
        displayName: "Shared 5",
        agentPort: 4027,
        cdpPort: 9228,
        profilePath: "shared-5-profile",
        startScriptPath: "start-shared-5.ps1"
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
      { workerId: "wife", status: "stop_requested" },
      { workerId: "shared-1", status: "stop_requested" },
      { workerId: "shared-2", status: "stop_requested" },
      { workerId: "shared-3", status: "stop_requested" },
      { workerId: "shared-4", status: "stop_requested" },
      { workerId: "shared-5", status: "stop_requested" }
    ]
  );
  assert.deepEqual(sequence, [
    "worker:dad",
    "worker:wife",
    "worker:shared-1",
    "worker:shared-2",
    "worker:shared-3",
    "worker:shared-4",
    "worker:shared-5",
    "proxy"
  ]);
});

test("startPool requests compact visible runtime for each configured worker by default", async () => {
  const controller = new HostController(createConfig());
  const calls = [];

  controller.startWorker = async (workerId, runtimeMode, profileStrategy, browserWindowMode) => {
    calls.push({
      workerId,
      runtimeMode,
      profileStrategy,
      browserWindowMode
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
  assert.equal(result.runtimeMode, "visible_auth");
  assert.equal(result.browserWindowMode, "CompactCorner");
  assert.deepEqual(calls, [
    {
      workerId: "dad",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "wife",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-1",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-2",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-3",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-4",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-5",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    }
  ]);
});

test("startWorker supports diagnostic_fresh without overwriting the durable profile path", async () => {
  const controller = new HostController(createConfig());
  const capturedStarts = [];

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
    agentListening: false,
    browserListening: false,
    runtimeMode: runtimeModeFallback,
    headless: false,
    cdpAttached: true,
    proxyServerConfigured: true,
    runtimeStatus: null
  });
  controller.requestWorkerStart = async (_worker, runtimeMode, _proxyServerUrl, startOptions) => {
    capturedStarts.push({
      runtimeMode,
      profileStrategy: startOptions.profileStrategy,
      profilePath: startOptions.profilePath,
      browserWindowMode: startOptions.browserWindowMode
    });
  };
  controller.observeWorkerStartup = async (_worker, runtimeMode) => ({
    workerId: "dad",
    displayName: "Dad",
    agentPort: 4021,
    cdpPort: 9222,
    proxyServer: "http://127.0.0.1:7897",
    status: "started",
    startupStatus: "started",
    agentListening: true,
    browserListening: true,
    runtimeMode,
    headless: false,
    cdpAttached: true,
    proxyServerConfigured: true,
    runtimeStatus: "ready"
  });

  const result = await controller.startWorker(
    "dad",
    "visible_auth",
    "diagnostic_fresh"
  );

  assert.equal(result.profileStrategy, "diagnostic_fresh");
  assert.match(result.profilePath, /host-profile-diagnostics[\\/]dad$/);
  assert.deepEqual(capturedStarts, [
    {
      runtimeMode: "visible_auth",
      profileStrategy: "diagnostic_fresh",
      profilePath: result.profilePath,
      browserWindowMode: "CompactCorner"
    }
  ]);
  assert.equal(createConfig().workers[0].profilePath, "dad-profile");
});

test("startPool forwards explicit compact visible startup mode", async () => {
  const controller = new HostController(createConfig());
  const calls = [];

  controller.startWorker = async (workerId, runtimeMode, profileStrategy, browserWindowMode) => {
    calls.push({
      workerId,
      runtimeMode,
      profileStrategy,
      browserWindowMode
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
  };
  controller.getHealthSnapshot = async () => ({
    proxyListening: true,
    proxyServerUrl: "http://127.0.0.1:7897",
    poolStatus: "ready",
    workers: []
  });

  const result = await controller.startPool("visible_auth", "CompactCorner");

  assert.equal(result.action, "pool_start_requested");
  assert.equal(result.runtimeMode, "visible_auth");
  assert.equal(result.browserWindowMode, "CompactCorner");
  assert.deepEqual(calls, [
    {
      workerId: "dad",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "wife",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-1",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-2",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-3",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-4",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
    },
    {
      workerId: "shared-5",
      runtimeMode: "visible_auth",
      profileStrategy: "durable",
      browserWindowMode: "CompactCorner"
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
    runtimeClass: "host_alternate_desktop",
    headless: true,
    cdpAttached: false,
    proxyServerConfigured: true,
    runtimeStatus: "ready"
  });
  controller.requestWorkerStart = async () => {
    throw new Error("should_not_start_process");
  };

  const result = await controller.startWorker("dad", "alternate_desktop");

  assert.equal(result.status, "already_running");
  assert.equal(result.startupStatus, "already_running");
  assert.equal(result.runtimeMode, "alternate_desktop");
  assert.equal(result.agentListening, true);
  assert.equal(result.browserListening, true);
  assert.equal(result.runtimeStatus, "ready");
});

test("startWorker restarts an already-running worker when compact visible runtime is requested", async () => {
  const controller = new HostController(createConfig());
  const sequence = [];

  controller.ensureProxyReady = async () => ({
    listenHost: "127.0.0.1",
    listenPort: 7897,
    proxyServerUrl: "http://127.0.0.1:7897"
  });

  let statusChecks = 0;
  controller.getWorkerStatus = async (_worker, runtimeModeFallback) => {
    statusChecks += 1;

    if (statusChecks === 1) {
      return {
        workerId: "wife",
        displayName: "Wife",
        agentPort: 4022,
        cdpPort: 9223,
        proxyServer: "http://127.0.0.1:7897",
        agentListening: true,
        browserListening: true,
        runtimeMode: "visible_auth",
        runtimeClass: "host_visible_auth",
        headless: false,
        cdpAttached: true,
        proxyServerConfigured: true,
        runtimeStatus: "ready"
      };
    }

    if (statusChecks === 2) {
      return {
        workerId: "wife",
        displayName: "Wife",
        agentPort: 4022,
        cdpPort: 9223,
        proxyServer: "http://127.0.0.1:7897",
        agentListening: false,
        browserListening: false,
        runtimeMode: runtimeModeFallback,
        runtimeClass: null,
        headless: null,
        cdpAttached: null,
        proxyServerConfigured: null,
        runtimeStatus: null
      };
    }

    return {
      workerId: "wife",
      displayName: "Wife",
      agentPort: 4022,
      cdpPort: 9223,
      proxyServer: "http://127.0.0.1:7897",
      agentListening: true,
      browserListening: true,
      runtimeMode: "visible_auth",
      runtimeClass: "host_visible_compact",
      headless: false,
      cdpAttached: true,
      proxyServerConfigured: true,
      runtimeStatus: "ready"
    };
  };
  controller.requestWorkerStop = async () => {
    sequence.push("stop");
  };
  controller.requestWorkerStart = async (_worker, runtimeMode, _proxyServerUrl, startOptions) => {
    sequence.push({
      runtimeMode,
      browserWindowMode: startOptions.browserWindowMode
    });
  };

  const result = await controller.startWorker(
    "wife",
    "visible_auth",
    "durable",
    "CompactCorner"
  );

  assert.deepEqual(sequence, [
    "stop",
    {
      runtimeMode: "visible_auth",
      browserWindowMode: "CompactCorner"
    }
  ]);
  assert.equal(result.status, "started");
  assert.equal(result.runtimeClass, "host_visible_compact");
  assert.equal(result.browserWindowMode, "CompactCorner");
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
    "alternate_desktop",
    5,
    0
  );

  assert.equal(result.status, "startup_timeout");
  assert.equal(result.startupStatus, "startup_timeout");
  assert.equal(result.runtimeMode, "alternate_desktop");
  assert.equal(result.agentListening, true);
  assert.equal(result.runtimeStatus, null);
});

test("stopWorker waits until the worker ports are no longer reachable", async () => {
  const controller = new HostController(createConfig());
  const sequence = [];
  let statusChecks = 0;

  controller.requestWorkerStop = async () => {
    sequence.push("stop-requested");
  };
  controller.getWorkerStatus = async () => {
    statusChecks += 1;

    if (statusChecks === 1) {
      return {
        workerId: "dad",
        displayName: "Dad",
        agentPort: 4021,
        cdpPort: 9222,
        proxyServer: "http://127.0.0.1:7897",
        agentListening: true,
        browserListening: true,
        runtimeMode: "alternate_desktop",
        runtimeClass: "host_alternate_desktop",
        runtimeStatus: "ready"
      };
    }

    return {
      workerId: "dad",
      displayName: "Dad",
      agentPort: 4021,
      cdpPort: 9222,
      proxyServer: "http://127.0.0.1:7897",
      agentListening: false,
      browserListening: false,
      runtimeMode: null,
      runtimeClass: null,
      runtimeStatus: null
    };
  };

  const result = await controller.stopWorker("dad");

  assert.deepEqual(sequence, ["stop-requested"]);
  assert.equal(result.status, "stop_requested");
  assert.equal(statusChecks, 2);
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
    { workerId: "dad", runtimeMode: "visible_auth" },
    { workerId: "wife", runtimeMode: "visible_auth" },
    { workerId: "shared-1", runtimeMode: "visible_auth" },
    { workerId: "shared-2", runtimeMode: "visible_auth" },
    { workerId: "shared-3", runtimeMode: "visible_auth" },
    { workerId: "shared-4", runtimeMode: "visible_auth" },
    { workerId: "shared-5", runtimeMode: "visible_auth" }
  ]);
});
