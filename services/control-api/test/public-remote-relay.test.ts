import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { ChatRelayTransport } from "../src/chat/chat-types.js";
import type { ChatBootstrapTransport } from "../src/chat/chat-bootstrap-types.js";
import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];
const API_TOKEN = "remote-token";

function createRelayTransport(): ChatRelayTransport {
  return {
    async deliver(request) {
      return {
        assistantText: `reply:${request.bodyText}`
      };
    }
  };
}

function createTestRuntime(options: {
  relayTransport?: ChatRelayTransport;
  bootstrapTransport?: ChatBootstrapTransport;
  workerDefinitions?: ControlApiConfig["workerDefinitions"];
  findFallbackWorkerId?: () => Promise<string | null>;
  listFallbackWorkerIds?: () => Promise<string[]>;
  remoteRelayRequestTimeoutMs?: number;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "control-api-remote-relay-"));
  tempDirectories.push(root);

  const config: ControlApiConfig = {
    serviceName: "owmcgp-remote-relay",
    mode: "remote_relay",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    remoteRelayApiToken: API_TOKEN,
    remoteRelayRequestTimeoutMs: options.remoteRelayRequestTimeoutMs ?? 10_000,
    remoteRelayTopologyHint: "pending",
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
    workerDefinitions:
      options.workerDefinitions ?? [
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
    relayTransport: options.relayTransport ?? createRelayTransport(),
    bootstrapTransport: options.bootstrapTransport ?? createReadyBootstrapTransport(),
    findFallbackWorkerId: options.findFallbackWorkerId,
    listFallbackWorkerIds: options.listFallbackWorkerIds
  });
  const app = createControlApiApp(runtime);

  return { runtime, app };
}

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }

  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, {
        recursive: true,
        force: true
      });
    }
  }
});

describe("public remote relay routes", () => {
  it("requires bearer auth for remote health", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    await request(app)
      .get("/api/relay/health")
      .expect(401);
  });

  it("returns remote relay health in remote mode", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/api/relay/health")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("owmcgp-remote-relay");
    expect(response.body.mode).toBe("remote_relay");
    expect(response.body.workerCount).toBe(1);
    expect(response.body.topology).toBe("pending");
  });

  it("creates a fresh dialog and returns the assistant reply", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        requestedForLabel: "Remote caller",
        newDialog: true,
        messageText: "hello"
      })
      .expect(200);

    expect(response.body.dialogId).toBeTruthy();
    expect(response.body.sessionId).toBe(response.body.dialogId);
    expect(response.body.workerId).toBe("wife");
    expect(response.body.conversationMode).toBe("temporary");
    expect(response.body.modelLabel).toBe("GPT-5.4 Thinking");
    expect(response.body.assistantReplyText).toBe("reply:hello");
    expect(response.body.relayResult.status).toBe("completed");
  });

  it("supports pinned worker selection for remote verification", async () => {
    const { app, runtime } = createTestRuntime({
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
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        requestedForLabel: "Pinned remote caller",
        workerId: "dad",
        newDialog: true,
        messageText: "hello from dad"
      })
      .expect(200);

    expect(response.body.workerId).toBe("dad");
    expect(response.body.assistantReplyText).toBe("reply:hello from dad");
  });

  it("falls back to a directly reachable worker when queue activation times out", async () => {
    const { app, runtime } = createTestRuntime({
      workerDefinitions: [
        {
          workerId: "wife",
          displayName: "Wife",
          containerName: "worker-wife",
          profilePath: "/profiles/wife",
          agentBaseUrl: "http://worker-wife:4020",
          defaultStatus: "starting"
        }
      ],
      findFallbackWorkerId: async () => "wife",
      remoteRelayRequestTimeoutMs: 3_000
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        requestedForLabel: "Remote caller",
        newDialog: true,
        messageText: "hello via fallback"
      })
      .expect(200);

    expect(response.body.workerId).toBe("wife");
    expect(response.body.assistantReplyText).toBe("reply:hello via fallback");
  }, 10_000);

  it("retries a fresh remote dialog on the next worker when the first bootstrap fails", async () => {
    const { app, runtime } = createTestRuntime({
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
      ],
      bootstrapTransport: {
        async bootstrap(request) {
          if (request.workerId === "dad") {
            return {
              status: "failed",
              conversationMode: "temporary",
              modelLabel: null,
              failureCode: "temporary_entry_not_found"
            };
          }

          return {
            status: "ready",
            conversationMode: "temporary",
            modelLabel: "GPT-5.4 Thinking",
            failureCode: null
          };
        }
      },
      listFallbackWorkerIds: async () => ["dad", "wife"]
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "owmcgp-browser",
        messages: [
          {
            role: "user",
            content: "retry me"
          }
        ]
      })
      .expect(200);

    expect(response.body.worker_id).toBe("wife");
    expect(response.body.choices[0].message.content).toBe("reply:retry me");
  });

  it("retries a fresh remote dialog on the next worker when the first relay fails", async () => {
    const { app, runtime } = createTestRuntime({
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
      ],
      relayTransport: {
        async deliver(request) {
          if (request.workerId === "dad") {
            return {
              failureCode: "reply_timeout",
              failureClass: "fatal",
              failureStage: "capture"
            };
          }

          return {
            assistantText: `reply:${request.bodyText}`
          };
        }
      },
      listFallbackWorkerIds: async () => ["dad", "wife"]
    });
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "owmcgp-browser",
        messages: [
          {
            role: "user",
            content: "relay retry"
          }
        ]
      })
      .expect(200);

    expect(response.body.worker_id).toBe("wife");
    expect(response.body.choices[0].message.content).toBe("reply:relay retry");
  });

  it("rejects unknown pinned workers", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        requestedForLabel: "Remote caller",
        workerId: "missing-worker",
        newDialog: true,
        messageText: "hello"
      })
      .expect(404);

    expect(response.body.error).toBe("requested_worker_not_found");
  });

  it("continues an existing dialog", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const first = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        requestedForLabel: "Remote caller",
        newDialog: true,
        messageText: "first"
      })
      .expect(200);

    const second = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        dialogId: first.body.dialogId,
        newDialog: false,
        messageText: "second"
      })
      .expect(200);

    expect(second.body.dialogId).toBe(first.body.dialogId);
    expect(second.body.sessionId).toBe(first.body.sessionId);
    expect(second.body.assistantReplyText).toBe("reply:second");
  });

  it("ends an active dialog explicitly", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const dialog = await request(app)
      .post("/api/relay/ask")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        requestedForLabel: "Remote caller",
        newDialog: true,
        messageText: "finish me"
      })
      .expect(200);

    const endResponse = await request(app)
      .post(`/api/relay/dialogs/${dialog.body.dialogId}/end`)
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .expect(200);

    expect(endResponse.body.dialogId).toBe(dialog.body.dialogId);
    expect(endResponse.body.state).toBe("ended");
    expect(endResponse.body.endReason).toBe("manual_end");
  });

  it("does not expose shared-screen routes in remote mode", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    await request(app)
      .get("/")
      .expect(404);

    await request(app)
      .post("/api/sessions")
      .send({
        requestedForLabel: "Should not exist"
      })
      .expect(404);
  });

  it("exposes an OpenAI-compatible model list", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/v1/models")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .expect(200);

    expect(response.body.object).toBe("list");
    expect(response.body.data.map((entry: { id: string }) => entry.id)).toContain(
      "owmcgp-browser"
    );
  });

  it("requires bearer auth for OpenAI-compatible routes", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    await request(app)
      .post("/v1/chat/completions")
      .send({
        model: "owmcgp-browser",
        messages: [
          {
            role: "user",
            content: "hello"
          }
        ]
      })
      .expect(401);
  });

  it("creates a fresh dialog through the OpenAI-compatible chat completions route", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "owmcgp-browser",
        user: "API trial",
        messages: [
          {
            role: "system",
            content: "You are helpful"
          },
          {
            role: "user",
            content: "hello from compatible api"
          }
        ]
      })
      .expect(200);

    expect(response.body.object).toBe("chat.completion");
    expect(response.body.model).toBe("owmcgp-browser");
    expect(response.body.actual_model_label).toBe("GPT-5.4 Thinking");
    expect(response.body.conversation_id).toBeNull();
    expect(response.body.dialog_closed).toBe(true);
    expect(response.body.worker_id).toBe("wife");
    expect(response.body.choices[0].message.role).toBe("assistant");
    expect(response.body.choices[0].message.content).toBe(
      "reply:hello from compatible api"
    );
    expect(response.body.usage.total_tokens).toBeGreaterThan(0);
  });

  it("continues a dialog through conversation_id when keep_dialog_open=true", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const first = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "owmcgp-browser",
        keep_dialog_open: true,
        messages: [
          {
            role: "user",
            content: "first"
          }
        ]
      })
      .expect(200);

    expect(first.body.conversation_id).toBeTruthy();
    expect(first.body.dialog_closed).toBe(false);

    const second = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "owmcgp-browser",
        conversation_id: first.body.conversation_id,
        messages: [
          {
            role: "assistant",
            content: first.body.choices[0].message.content
          },
          {
            role: "user",
            content: "second"
          }
        ]
      })
      .expect(200);

    expect(second.body.conversation_id).toBe(first.body.conversation_id);
    expect(second.body.dialog_closed).toBe(false);
    expect(second.body.choices[0].message.content).toBe("reply:second");
  });

  it("rejects stream=true for the OpenAI-compatible route", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "owmcgp-browser",
        stream: true,
        messages: [
          {
            role: "user",
            content: "hello"
          }
        ]
      })
      .expect(400);

    expect(response.body.error.code).toBe("stream_not_supported");
  });

  it("supports array text content in the OpenAI-compatible route", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .post("/v1/chat/completions")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .send({
        model: "gpt-5.4-thinking",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "hello"
              },
              {
                type: "input_text",
                text: "world"
              }
            ]
          }
        ]
      })
      .expect(200);

    expect(response.body.choices[0].message.content).toBe("reply:hello\nworld");
  });
});
