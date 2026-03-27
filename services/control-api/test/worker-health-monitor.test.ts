import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkerDefinition } from "../src/config.js";
import { createWorkerHealthMonitor } from "../src/workers/worker-health-monitor.js";
import { createWorkerRegistry } from "../src/workers/worker-registry.js";

const WORKERS: WorkerDefinition[] = [
  {
    workerId: "dad",
    displayName: "Dad",
    containerName: "worker-dad",
    profilePath: "/profiles/dad",
    agentBaseUrl: "http://worker-dad:4020",
    defaultStatus: "ready"
  }
];

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    },
    status
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("worker health monitor", () => {
  it("marks the worker disconnected after two failed polls", async () => {
    const workerRegistry = createWorkerRegistry(WORKERS);
    const sessionService = {
      handleWorkerReady: vi.fn(),
      handleWorkerStatusChange: vi.fn()
    };

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const monitor = createWorkerHealthMonitor({
      workerRegistry,
      sessionService,
      pollIntervalMs: 5_000,
      timeoutMs: 3_000
    });

    await monitor.runHealthSweep(new Date("2026-03-27T10:00:00.000Z"));
    expect(workerRegistry.getWorker("dad")?.status.status).toBe("ready");

    await monitor.runHealthSweep(new Date("2026-03-27T10:00:05.000Z"));

    const worker = workerRegistry.getWorker("dad");
    expect(worker?.status.status).toBe("disconnected");
    expect(worker?.runtimeStatus).toBe("disconnected");
    expect(sessionService.handleWorkerStatusChange).toHaveBeenCalledWith(
      "dad",
      new Date("2026-03-27T10:00:05.000Z")
    );
  });

  it("recovers the worker after a healthy poll response", async () => {
    const workerRegistry = createWorkerRegistry(WORKERS);
    workerRegistry.updateWorker("dad", {
      status: "disconnected",
      reason: "worker health poll failed twice",
      runtimeStatus: "disconnected"
    });
    const sessionService = {
      handleWorkerReady: vi.fn(),
      handleWorkerStatusChange: vi.fn()
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          runtimeStatus: "ready",
          browserContextReady: true,
          lastRelayAt: null,
          lastRelayFailureCode: null
        })
      )
    );

    const monitor = createWorkerHealthMonitor({
      workerRegistry,
      sessionService,
      pollIntervalMs: 5_000,
      timeoutMs: 3_000
    });

    await monitor.runHealthSweep(new Date("2026-03-27T10:01:00.000Z"));

    const worker = workerRegistry.getWorker("dad");
    expect(worker?.status.status).toBe("ready");
    expect(worker?.runtimeStatus).toBe("ready");
    expect(worker?.lastSeenAt).toBe("2026-03-27T10:01:00.000Z");
    expect(sessionService.handleWorkerReady).toHaveBeenCalledWith(
      new Date("2026-03-27T10:01:00.000Z")
    );
  });
});
