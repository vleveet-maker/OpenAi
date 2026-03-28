import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatRelayTransport } from "../src/chat/chat-types.js";
import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];
const INTERNAL_ADMIN_TOKEN = "secret";

function createPendingRelayTransport(): ChatRelayTransport {
  return {
    async deliver() {
      return new Promise(() => undefined);
    }
  };
}

function createTestRuntime(
  options: {
    relayTransport?: ChatRelayTransport;
    dockerEngineClient?: {
      restartContainer: ReturnType<typeof vi.fn>;
      inspectContainer: ReturnType<typeof vi.fn>;
    };
    healthMonitor?: {
      startHealthMonitor: ReturnType<typeof vi.fn>;
      stopHealthMonitor: ReturnType<typeof vi.fn>;
      runHealthSweep: ReturnType<typeof vi.fn>;
    };
    bootstrapTransport?: ReturnType<typeof createReadyBootstrapTransport>;
  } = {}
) {
  const root = mkdtempSync(join(tmpdir(), "control-api-observability-"));
  tempDirectories.push(root);

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: INTERNAL_ADMIN_TOKEN,
    hostControllerBaseUrl: undefined,
    hostControllerToken: undefined,
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
    ]
  };

  const runtime = createControlApiRuntime(config, {
    bootstrapTransport: createReadyBootstrapTransport(),
    ...options
  });
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app
  };
}

async function flushQueuedHandlers() {
  await Promise.resolve();
  await Promise.resolve();
}

async function flushBootstrap() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();

  while (cleanupCallbacks.length > 0) {
    const cleanup = cleanupCallbacks.pop();
    cleanup?.();
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

describe("internal observability and guardrails", () => {
  it("requires the internal admin token and renders the operator page", async () => {
    const { app, runtime } = createTestRuntime({
      bootstrapTransport: createReadyBootstrapTransport()
    });
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    await request(app)
      .get("/internal/admin")
      .expect(403);

    const response = await request(app)
      .get("/internal/admin")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(200);

    expect(response.text).toContain("Worker status summary");
    expect(response.text).toContain("Recent failures");
    expect(response.text).toContain("Recent lifecycle events");
  });

  it("returns minimal health and readiness responses with hardening headers", async () => {
    const { app, runtime } = createTestRuntime({
      bootstrapTransport: createReadyBootstrapTransport()
    });
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const healthResponse = await request(app)
      .get("/healthz")
      .expect(200);

    expect(healthResponse.body.status).toBe("ok");
    expect(healthResponse.body.workerStatusCounts).toBeUndefined();
    expect(healthResponse.headers["x-frame-options"]).toBe("DENY");
    expect(healthResponse.headers["x-content-type-options"]).toBe("nosniff");
    expect(healthResponse.headers["referrer-policy"]).toBe("no-referrer");

    const readyResponse = await request(app)
      .get("/readyz")
      .expect(200);

    expect(readyResponse.body.status).toBe("ready");
    expect(readyResponse.body.totalWorkers).toBe(2);
    expect(readyResponse.body.workerStatusCounts).toMatchObject({
      ready: 2
    });
    expect(JSON.stringify(readyResponse.body)).not.toContain("/profiles/");
  });

  it("records relay failures and exposes bounded observability events", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const relayTransport = {
      deliver: vi
        .fn<ChatRelayTransport["deliver"]>()
        .mockRejectedValueOnce(
          Object.assign(new Error("worker down"), {
            code: "worker_relay_unreachable"
          })
        )
        .mockResolvedValueOnce({
          failureCode: "selector_not_found",
          failureClass: "fatal",
          failureStage: "dispatch",
          completedAt: "2026-03-27T10:00:02.000Z"
        })
    } satisfies ChatRelayTransport;
    const { app, runtime } = createTestRuntime({
      relayTransport,
      bootstrapTransport: createReadyBootstrapTransport()
    });
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    const retrySession = runtime.sessionService.createSession(
      "Retry Session",
      new Date("2026-03-27T10:00:00.000Z")
    );
    await flushBootstrap();
    runtime.chatRelayService.sendMessage(
      retrySession.session.sessionId,
      "Hello retry",
      new Date("2026-03-27T10:00:00.000Z")
    );
    await flushQueuedHandlers();

    const fatalSession = runtime.sessionService.createSession(
      "Fatal Session",
      new Date("2026-03-27T10:00:01.000Z")
    );
    await flushBootstrap();
    runtime.chatRelayService.sendMessage(
      fatalSession.session.sessionId,
      "Hello fatal",
      new Date("2026-03-27T10:00:01.000Z")
    );
    await flushQueuedHandlers();

    const boundedResponse = await request(app)
      .get("/internal/observability/events?limit=1")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(200);

    expect(boundedResponse.body).toHaveLength(1);
    expect(boundedResponse.body[0].eventType).toBe("relay_terminal_failure");

    const summaryResponse = await request(app)
      .get("/internal/observability/summary")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(200);

    expect(summaryResponse.body.recentFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "relay_terminal_failure"
        })
      ])
    );
    expect(summaryResponse.body.lastEventAt).toBeTruthy();
  });

  it("captures restart and reauth lifecycle events", async () => {
    const dockerEngineClient = {
      restartContainer: vi.fn().mockResolvedValue(undefined),
      inspectContainer: vi.fn()
    };
    const healthMonitor = {
      startHealthMonitor: vi.fn(),
      stopHealthMonitor: vi.fn(),
      runHealthSweep: vi.fn().mockResolvedValue(undefined)
    };
    const { app, runtime } = createTestRuntime({
      dockerEngineClient,
      healthMonitor
    });
    cleanupCallbacks.push(() => {
      runtime.dispose();
    });

    await request(app)
      .post("/internal/workers/dad/restart")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(202);

    await request(app)
      .post("/internal/workers/wife/reauth/start")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(202);

    await request(app)
      .post("/internal/workers/wife/reauth/complete")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(202);

    const eventsResponse = await request(app)
      .get("/internal/observability/events?limit=10")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(200);

    const eventTypes = eventsResponse.body.map(
      (event: { eventType: string }) => event.eventType
    );

    expect(eventTypes).toContain("worker_restart_requested");
    expect(eventTypes).toContain("worker_reauth_started");
    expect(eventTypes).toContain("worker_reauth_completed");

    const summaryResponse = await request(app)
      .get("/internal/observability/summary")
      .set("x-internal-admin-token", INTERNAL_ADMIN_TOKEN)
      .expect(200);

    expect(summaryResponse.body.recentRestarts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "worker_restart_requested"
        })
      ])
    );
  });
});
