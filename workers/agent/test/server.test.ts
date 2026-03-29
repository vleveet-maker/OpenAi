import { describe, expect, it } from "vitest";

import {
  createWorkerAgentRuntime,
  loadWorkerAgentConfig
} from "../src/server.js";

describe("worker server runtime telemetry", () => {
  it("loads host_alternate_desktop config with desktop metadata", () => {
    const config = loadWorkerAgentConfig({
      WORKER_ID: "dad",
      WORKER_RUNTIME_MODE: "alternate_desktop",
      WORKER_RUNTIME_CLASS: "host_alternate_desktop",
      WORKER_RUNTIME_DESKTOP_NAME: "OWMCGPT-dad",
      WORKER_CDP_ENDPOINT_URL: "http://127.0.0.1:9222",
      WORKER_HEADLESS: "false"
    });

    expect(config.runtimeMode).toBe("alternate_desktop");
    expect(config.runtimeClass).toBe("host_alternate_desktop");
    expect(config.runtimeDesktopName).toBe("OWMCGPT-dad");
    expect(config.headless).toBe(false);
  });

  it("exposes host_alternate_desktop health snapshot values", () => {
    const runtime = createWorkerAgentRuntime(
      loadWorkerAgentConfig({
        WORKER_ID: "dad",
        WORKER_RUNTIME_MODE: "alternate_desktop",
        WORKER_RUNTIME_CLASS: "host_alternate_desktop",
        WORKER_RUNTIME_DESKTOP_NAME: "OWMCGPT-dad",
        WORKER_CDP_ENDPOINT_URL: "http://127.0.0.1:9222",
        WORKER_HEADLESS: "false"
      }),
      {
        browserContextPromise: Promise.resolve({
          close: async () => {}
        } as never)
      }
    );

    const snapshot = runtime.getHealthSnapshot();

    expect(snapshot.runtimeMode).toBe("alternate_desktop");
    expect(snapshot.runtimeClass).toBe("host_alternate_desktop");
    expect(snapshot.runtimeDesktopName).toBe("OWMCGPT-dad");
    expect(snapshot.headless).toBe(false);
    expect(snapshot.lastBootstrapAt).toBeNull();
    expect(snapshot.lastBootstrapFailureCode).toBeNull();
    expect(snapshot.lastBootstrapStep).toBeNull();
    expect(snapshot.lastBootstrapUsability).toBeNull();
  });

  it("stores bootstrap telemetry separately from relay telemetry", async () => {
    const runtime = createWorkerAgentRuntime(
      loadWorkerAgentConfig({
        WORKER_ID: "dad",
        WORKER_RUNTIME_MODE: "alternate_desktop",
        WORKER_RUNTIME_CLASS: "host_alternate_desktop",
        WORKER_RUNTIME_DESKTOP_NAME: "OWMCGPT-dad",
        WORKER_CDP_ENDPOINT_URL: "http://127.0.0.1:9222",
        WORKER_HEADLESS: "false"
      }),
      {
        browserContextPromise: Promise.resolve({
          close: async () => {}
        } as never),
        bootstrapHandler: async () => ({
          status: "failed",
          conversationMode: "unknown",
          modelLabel: null,
          failureCode: "temporary_confirmation_not_found",
          step: "temporary_confirmation",
          stepDetail: "waiting for temporary chat confirmation",
          composerReady: false,
          challengeDetected: false,
          pageTitle: "ChatGPT",
          runtimeUsability: "surface_unusable",
          pageUrl: "https://chatgpt.com/"
        })
      }
    );

    await runtime.bootstrapSessionChat({
      sessionId: "session-1"
    });

    const snapshot = runtime.getHealthSnapshot();

    expect(snapshot.lastBootstrapAt).not.toBeNull();
    expect(snapshot.lastBootstrapFailureCode).toBe("temporary_confirmation_not_found");
    expect(snapshot.lastBootstrapStep).toBe("temporary_confirmation");
    expect(snapshot.lastBootstrapUsability).toBe("surface_unusable");
    expect(snapshot.lastRelayFailureCode).toBeNull();
  });
});
