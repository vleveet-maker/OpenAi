import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { clearChromiumSingletonArtifacts } from "../src/browser-launch.js";
import {
  createWorkerAgentApp,
  createWorkerAgentRuntime,
  DEFAULT_PREFERRED_REASONING_MODEL_LABELS,
  loadWorkerAgentConfig
} from "../src/server.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject
  };
}

async function startServer(
  app: ReturnType<typeof createWorkerAgentApp>
): Promise<{
  baseUrl: string;
  close(): Promise<void>;
}> {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("worker browser access runtime", () => {
  it("clears stale chromium singleton artifacts before launch", () => {
    const profilePath = mkdtempSync(join(tmpdir(), "worker-profile-"));

    try {
      for (const artifact of [
        "SingletonCookie",
        "SingletonLock",
        "SingletonSocket",
        "Default/LOCK"
      ]) {
        const targetPath = join(profilePath, artifact);
        mkdirSync(join(targetPath, ".."), {
          recursive: true
        });
        writeFileSync(targetPath, "stale");
      }

      clearChromiumSingletonArtifacts(profilePath);

      expect(() => clearChromiumSingletonArtifacts(profilePath)).not.toThrow();
    } finally {
      rmSync(profilePath, {
        force: true,
        recursive: true
      });
    }
  });

  it("includes browserAccess metadata on health and internal worker routes", async () => {
    const deferred = createDeferred<unknown>();
    const runtime = createWorkerAgentRuntime(loadWorkerAgentConfig({
      WORKER_ID: "dad",
      WORKER_DISPLAY_NAME: "Dad",
      WORKER_CONTAINER_NAME: "worker-dad",
      WORKER_AGENT_HOST: "127.0.0.1",
      WORKER_AGENT_PORT: "0",
      WORKER_PROFILE_PATH: "/profiles/dad",
      DISPLAY: ":99",
      BROWSER_ACCESS_HTTP_PORT: "6080"
    }), {
      browserContextPromise: deferred.promise as Promise<never>
    });
    const app = createWorkerAgentApp(runtime);
    const server = await startServer(app);

    const startingHealthResponse = await fetch(`${server.baseUrl}/health`);
    const startingHealth = await startingHealthResponse.json();
    expect(startingHealth.runtimeStatus).toBe("starting");
    expect(startingHealth.browserAccess).toEqual({
      enabled: true,
      ready: false,
      httpPort: 6080,
      display: ":99"
    });

    const internalWorkerResponse = await fetch(`${server.baseUrl}/internal/worker`);
    const internalWorker = await internalWorkerResponse.json();
    expect(internalWorker.browserAccess).toEqual({
      enabled: true,
      ready: false,
      httpPort: 6080,
      display: ":99"
    });

    deferred.resolve({
      close: vi.fn().mockResolvedValue(undefined)
    });
    await runtime.getBrowserContext();

    const readyHealthResponse = await fetch(`${server.baseUrl}/health`);
    const readyHealth = await readyHealthResponse.json();
    expect(readyHealth.runtimeStatus).toBe("ready");
    expect(readyHealth.browserAccess.ready).toBe(true);

    await server.close();
    await runtime.dispose();
  });

  it("reports starting before browser navigation completes", async () => {
    const deferred = createDeferred<unknown>();
    const runtime = createWorkerAgentRuntime(loadWorkerAgentConfig({
      WORKER_ID: "wife",
      WORKER_DISPLAY_NAME: "Wife",
      WORKER_CONTAINER_NAME: "worker-wife",
      WORKER_AGENT_HOST: "127.0.0.1",
      WORKER_AGENT_PORT: "0",
      WORKER_PROFILE_PATH: "/profiles/wife",
      DISPLAY: ":99",
      BROWSER_ACCESS_HTTP_PORT: "6080"
    }), {
      browserContextPromise: deferred.promise as Promise<never>
    });

    expect(runtime.getHealthSnapshot().runtimeStatus).toBe("starting");
    expect(runtime.getBrowserAccessSnapshot()).toEqual({
      enabled: true,
      ready: false,
      httpPort: 6080,
      display: ":99"
    });

    deferred.resolve({
      close: vi.fn().mockResolvedValue(undefined)
    });
    await runtime.getBrowserContext();

    expect(runtime.getHealthSnapshot().runtimeStatus).toBe("ready");
    expect(runtime.getBrowserAccessSnapshot().ready).toBe(true);

    await runtime.dispose();
  });

  it("parses preferred reasoning model labels and exposes the bootstrap route", async () => {
    const runtime = createWorkerAgentRuntime(loadWorkerAgentConfig({
      WORKER_ID: "dad",
      WORKER_DISPLAY_NAME: "Dad",
      WORKER_CONTAINER_NAME: "worker-dad",
      WORKER_AGENT_HOST: "127.0.0.1",
      WORKER_AGENT_PORT: "0",
      WORKER_PROFILE_PATH: "/profiles/dad",
      WORKER_PREFERRED_REASONING_MODEL_LABELS: "[\"GPT-5.4 Thinking\",\"GPT-5.4\"]"
    }), {
      browserContextPromise: Promise.resolve({
        close: vi.fn().mockResolvedValue(undefined)
      } as never),
      bootstrapHandler: vi.fn().mockResolvedValue({
        status: "ready",
        conversationMode: "temporary",
        modelLabel: "GPT-5.4 Thinking",
        failureCode: null,
        step: "complete",
        stepDetail: null,
        composerReady: true,
        challengeDetected: false,
        pageTitle: "ChatGPT",
        runtimeUsability: "usable",
        pageUrl: "https://chatgpt.com/"
      })
    });

    expect(runtime.config.preferredReasoningModelLabels).toEqual([
      "GPT-5.4 Thinking",
      "GPT-5.4"
    ]);
    expect(DEFAULT_PREFERRED_REASONING_MODEL_LABELS).toEqual([
      "GPT-5.4 Thinking",
      "GPT-5.4"
    ]);

    const app = createWorkerAgentApp(runtime);
    const server = await startServer(app);

    const response = await fetch(`${server.baseUrl}/internal/chat/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sessionId: "session-1"
      })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ready",
      conversationMode: "temporary",
      modelLabel: "GPT-5.4 Thinking"
    });

    await server.close();
    await runtime.dispose();
  });
});
