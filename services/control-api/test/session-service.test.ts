import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { WorkerDefinition } from "../src/config.js";
import { SessionService } from "../src/sessions/session-service.js";
import { SessionStore } from "../src/sessions/session-store.js";
import { createWorkerRegistry } from "../src/workers/worker-registry.js";

const WORKERS: WorkerDefinition[] = [
  {
    workerId: "dad",
    displayName: "Dad",
    containerName: "worker-dad",
    profilePath: "/profiles/dad",
    agentBaseUrl: "http://worker-dad:4020",
    defaultStatus: "ready"
  },
  {
    workerId: "wife",
    displayName: "Wife",
    containerName: "worker-wife",
    profilePath: "/profiles/wife",
    agentBaseUrl: "http://worker-wife:4020",
    defaultStatus: "ready"
  }
];

const tempDirectories: string[] = [];

function createTestService() {
  const root = mkdtempSync(join(tmpdir(), "control-api-session-test-"));
  tempDirectories.push(root);

  const store = new SessionStore(join(root, "session-routing.sqlite"));
  const workerRegistry = createWorkerRegistry(WORKERS);
  const service = new SessionService({
    store,
    workerRegistry,
    sessionDurationMinutes: 60,
    sweepIntervalMs: 5_000
  });

  service.bootstrap(new Date("2026-03-27T10:00:00.000Z"));

  return {
    service,
    workerRegistry,
    dispose() {
      service.close();
    }
  };
}

afterEach(() => {
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

describe("SessionService", () => {
  it("assigns a ready worker immediately", () => {
    const runtime = createTestService();

    const snapshot = runtime.service.createSession(
      "Operator Dad",
      new Date("2026-03-27T10:00:00.000Z")
    );

    expect(snapshot.session.state).toBe("active");
    expect(snapshot.session.workerId).toBe("dad");
    expect(snapshot.worker?.displayName).toBe("Dad");
    expect(runtime.workerRegistry.getWorker("dad")?.status.status).toBe("busy");

    runtime.dispose();
  });

  it("queues sessions in FIFO order and promotes after release", () => {
    const runtime = createTestService();

    const first = runtime.service.createSession(
      "First",
      new Date("2026-03-27T10:00:00.000Z")
    );
    runtime.service.createSession(
      "Second",
      new Date("2026-03-27T10:01:00.000Z")
    );
    const third = runtime.service.createSession(
      "Third",
      new Date("2026-03-27T10:02:00.000Z")
    );

    expect(third.session.state).toBe("queued");
    expect(runtime.service.getSessionSnapshot(third.session.sessionId)?.queuePosition).toBe(1);

    runtime.service.endActiveSession(
      first.session.sessionId,
      "manual_end",
      new Date("2026-03-27T10:05:00.000Z")
    );

    expect(runtime.service.getSessionSnapshot(third.session.sessionId)?.session.state).toBe("active");
    expect(runtime.service.getSessionSnapshot(third.session.sessionId)?.session.workerId).toBe("dad");

    runtime.dispose();
  });

  it("selects the least recently assigned ready worker", () => {
    const runtime = createTestService();

    const first = runtime.service.createSession(
      "First",
      new Date("2026-03-27T10:00:00.000Z")
    );
    const second = runtime.service.createSession(
      "Second",
      new Date("2026-03-27T10:01:00.000Z")
    );

    runtime.service.endActiveSession(
      first.session.sessionId,
      "manual_end",
      new Date("2026-03-27T10:10:00.000Z")
    );
    runtime.service.endActiveSession(
      second.session.sessionId,
      "manual_end",
      new Date("2026-03-27T10:11:00.000Z")
    );

    const third = runtime.service.createSession(
      "Third",
      new Date("2026-03-27T10:12:00.000Z")
    );

    expect(third.session.workerId).toBe("dad");

    runtime.dispose();
  });

  it("expires active sessions during sweeps", () => {
    const runtime = createTestService();

    const session = runtime.service.createSession(
      "Timer",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.service.runSweep(new Date("2026-03-27T11:00:01.000Z"));

    const updated = runtime.service.getSessionSnapshot(session.session.sessionId);
    expect(updated?.session.state).toBe("expired");
    expect(updated?.session.endReason).toBe("timer_expired");
    expect(runtime.workerRegistry.getWorker("dad")?.status.status).toBe("ready");

    runtime.dispose();
  });

  it("cancels queued sessions without touching active ones", () => {
    const runtime = createTestService();

    runtime.service.createSession(
      "First",
      new Date("2026-03-27T10:00:00.000Z")
    );
    runtime.service.createSession(
      "Second",
      new Date("2026-03-27T10:01:00.000Z")
    );
    const queued = runtime.service.createSession(
      "Queued",
      new Date("2026-03-27T10:02:00.000Z")
    );

    runtime.service.cancelQueuedSession(
      queued.session.sessionId,
      new Date("2026-03-27T10:03:00.000Z")
    );

    const updated = runtime.service.getSessionSnapshot(queued.session.sessionId);
    expect(updated?.session.state).toBe("cancelled");
    expect(updated?.session.endReason).toBe("cancelled");

    runtime.dispose();
  });

  it("rehydrates surviving sessions on boot", () => {
    const root = mkdtempSync(join(tmpdir(), "control-api-session-test-"));
    tempDirectories.push(root);
    const databasePath = join(root, "session-routing.sqlite");

    const initialStore = new SessionStore(databasePath);
    const initialRegistry = createWorkerRegistry(WORKERS);
    const initialService = new SessionService({
      store: initialStore,
      workerRegistry: initialRegistry,
      sessionDurationMinutes: 60,
      sweepIntervalMs: 5_000
    });

    initialService.bootstrap(new Date("2026-03-27T10:00:00.000Z"));
    const active = initialService.createSession(
      "Rehydrate",
      new Date("2026-03-27T10:00:00.000Z")
    );
    initialService.close();

    const rehydratedStore = new SessionStore(databasePath);
    const rehydratedRegistry = createWorkerRegistry(WORKERS);
    const rehydratedService = new SessionService({
      store: rehydratedStore,
      workerRegistry: rehydratedRegistry,
      sessionDurationMinutes: 60,
      sweepIntervalMs: 5_000
    });

    rehydratedService.bootstrap(new Date("2026-03-27T10:05:00.000Z"));

    expect(
      rehydratedRegistry.getWorker(active.session.workerId!)?.status.status
    ).toBe("busy");
    expect(
      rehydratedRegistry.getWorker(active.session.workerId!)?.assignedSessionId
    ).toBe(active.session.sessionId);

    rehydratedService.close();
  });

  it("ends active sessions when a worker becomes unavailable", () => {
    const runtime = createTestService();
    const session = runtime.service.createSession(
      "Unlucky",
      new Date("2026-03-27T10:00:00.000Z")
    );

    runtime.workerRegistry.updateWorker("dad", {
      status: "reauth_required",
      reason: "chatgpt signed out"
    });
    runtime.service.handleWorkerStatusChange(
      "dad",
      new Date("2026-03-27T10:03:00.000Z")
    );

    const updated = runtime.service.getSessionSnapshot(session.session.sessionId);
    expect(updated?.session.state).toBe("ended");
    expect(updated?.session.endReason).toBe("worker_unavailable");
    expect(runtime.workerRegistry.getWorker("dad")?.status.status).toBe("reauth_required");

    runtime.dispose();
  });
});
