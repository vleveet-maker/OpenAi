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
    const eventRecorder = {
      recordEvent: vi.fn()
    };
    const sessionService = {
      handleWorkerReady: vi.fn(),
      handleWorkerStatusChange: vi.fn()
    };

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const monitor = createWorkerHealthMonitor({
      workerRegistry,
      sessionService,
      pollIntervalMs: 5_000,
      timeoutMs: 3_000,
      eventRecorder
    });

    await monitor.runHealthSweep(new Date("2026-03-27T10:00:00.000Z"));
    expect(workerRegistry.getWorker("dad")?.status.status).toBe("ready");

    await monitor.runHealthSweep(new Date("2026-03-27T10:00:05.000Z"));

    const worker = workerRegistry.getWorker("dad");
    expect(worker?.status.status).toBe("disconnected");
    expect(worker?.runtimeStatus).toBe("disconnected");
    expect(worker?.runtimeCapability).toBe("unreachable");
    expect(sessionService.handleWorkerStatusChange).toHaveBeenCalledWith(
      "dad",
      new Date("2026-03-27T10:00:05.000Z")
    );
    expect(eventRecorder.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "worker_status_changed",
        severity: "error",
        workerId: "dad"
      })
    );
  });

  it("recovers the worker after a healthy poll response", async () => {
    const workerRegistry = createWorkerRegistry(WORKERS);
    const eventRecorder = {
      recordEvent: vi.fn()
    };
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
          lastBootstrapAt: "2026-03-27T10:00:58.000Z",
          lastBootstrapFailureCode: null,
          lastBootstrapStep: "complete",
          lastBootstrapUsability: "usable",
          lastRelayAt: null,
          lastRelayFailureCode: null
        })
      )
    );

    const monitor = createWorkerHealthMonitor({
      workerRegistry,
      sessionService,
      pollIntervalMs: 5_000,
      timeoutMs: 3_000,
      eventRecorder
    });

    await monitor.runHealthSweep(new Date("2026-03-27T10:01:00.000Z"));

    const worker = workerRegistry.getWorker("dad");
    expect(worker?.status.status).toBe("ready");
    expect(worker?.runtimeStatus).toBe("ready");
    expect(worker?.runtimeCapability).toBe("reachable_but_unusable");
    expect(worker?.lastSeenAt).toBe("2026-03-27T10:01:00.000Z");
    expect(sessionService.handleWorkerReady).toHaveBeenCalledWith(
      new Date("2026-03-27T10:01:00.000Z")
    );
    expect(eventRecorder.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "worker_status_changed",
        severity: "info",
        workerId: "dad"
      })
    );
  });

  it("keeps a reachable worker as reachable_but_unusable when bootstrap auth evidence exists", async () => {
    const workerRegistry = createWorkerRegistry(WORKERS);
    const eventRecorder = {
      recordEvent: vi.fn()
    };
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
          lastBootstrapAt: "2026-03-27T10:01:59.000Z",
          lastBootstrapFailureCode: "bootstrap_auth_required",
          lastBootstrapStep: "auth_check",
          lastBootstrapUsability: "auth_required",
          lastRelayAt: "2026-03-27T10:02:00.000Z",
          lastRelayFailureCode: null
        })
      )
    );

    const monitor = createWorkerHealthMonitor({
      workerRegistry,
      sessionService,
      pollIntervalMs: 5_000,
      timeoutMs: 3_000,
      eventRecorder
    });

    await monitor.runHealthSweep(new Date("2026-03-27T10:02:05.000Z"));

    const worker = workerRegistry.getWorker("dad");
    expect(worker?.runtimeCapability).toBe("reachable_but_unusable");
    expect(worker?.lastBootstrapFailureCode).toBe("bootstrap_auth_required");
    expect(worker?.lastBootstrapStep).toBe("auth_check");
    expect(worker?.lastRelayFailureCode).toBeUndefined();
  });
});
