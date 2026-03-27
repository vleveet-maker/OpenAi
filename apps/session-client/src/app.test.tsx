import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "./app";
import type {
  SessionConversationSnapshot,
  SessionMessageRecord,
  SessionSnapshot
} from "./session-types";

function buildSnapshot(
  partial: Partial<SessionSnapshot["session"]> & { sessionId: string },
  queuePosition: number | null = null
): SessionSnapshot {
  const session = {
    requestedForLabel: "Shared Test",
    state: "active" as const,
    workerId: "dad",
    queuedAt: "2026-03-27T10:00:00.000Z",
    startedAt: "2026-03-27T10:00:00.000Z",
    endsAt: "2026-03-27T11:00:00.000Z",
    endedAt: null,
    endReason: null,
    ...partial
  };

  return {
    session,
    queuePosition,
    worker: session.workerId
      ? {
          workerId: session.workerId,
          displayName: "Dad",
          status: session.state === "active" ? "busy" : "ready"
        }
      : null
  };
}

function buildMessage(
  partial: Partial<SessionMessageRecord> & {
    messageId: string;
    role: SessionMessageRecord["role"];
  }
): SessionMessageRecord {
  return {
    sessionId: "session-1",
    workerId: "dad",
    state: "complete",
    body: "",
    replyToMessageId: null,
    failureCode: null,
    createdAt: "2026-03-27T10:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
    completedAt: "2026-03-27T10:00:00.000Z",
    ...partial
  };
}

function buildConversation(
  sessionId: string,
  partial: Partial<SessionConversationSnapshot> = {}
): SessionConversationSnapshot {
  return {
    sessionId,
    worker: {
      workerId: "dad",
      displayName: "Dad",
      status: "busy"
    },
    canSend: true,
    pendingAssistantMessageId: null,
    messages: [],
    ...partial
  };
}

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    },
    status
  });
}

function renderWithRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}

function createFetchStub(
  routes: Record<
    string,
    | { body: unknown; status?: number }
    | Array<{ body: unknown; status?: number }>
  >
) {
  const callCounts = new Map<string, number>();

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const path =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const key = `${method} ${path}`;
    const entry = routes[key];

    if (!entry) {
      throw new Error(`Unexpected fetch request: ${key}`);
    }

    if (Array.isArray(entry)) {
      const index = callCounts.get(key) ?? 0;
      const response = entry[Math.min(index, entry.length - 1)];
      callCounts.set(key, index + 1);
      return createJsonResponse(response.body, response.status);
    }

    return createJsonResponse(entry.body, entry.status);
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Session client app", () => {
  it("creates a session from the start screen and resumes it", async () => {
    const session = buildSnapshot({
      sessionId: "session-1"
    });
    const conversation = buildConversation("session-1");

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "POST /api/sessions": {
          body: session
        },
        "GET /api/session-bootstrap/session-1": {
          body: session
        },
        "GET /api/sessions/session-1/messages": {
          body: conversation
        }
      })
    );

    renderWithRoute("/");

    fireEvent.change(screen.getByLabelText(/who is this hour for/i), {
      target: {
        value: "Evening Shared Session"
      }
    });
    fireEvent.submit(screen.getByRole("button", { name: /start timed session/i }));

    await screen.findByText(/active session/i);
    expect(screen.getByText(/the shared screen is pinned to dad/i)).toBeInTheDocument();
  });

  it("promotes a queued session to active after polling", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const queued = buildSnapshot(
      {
        sessionId: "session-2",
        state: "queued",
        workerId: null,
        startedAt: null,
        endsAt: null
      },
      1
    );
    const active = buildSnapshot({
      sessionId: "session-2",
      requestedForLabel: "Queued Then Active"
    });

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-2": {
          body: queued
        },
        "GET /api/sessions/session-2/messages": [
          {
            body: buildConversation("session-2", {
              worker: null,
              canSend: false
            })
          },
          {
            body: buildConversation("session-2", {
              messages: [
                buildMessage({
                  messageId: "assistant-queued",
                  role: "assistant",
                  body: "Active now"
                })
              ]
            })
          }
        ],
        "GET /api/sessions/session-2": {
          body: active
        }
      })
    );

    renderWithRoute("/session/session-2");
    await flushAsyncWork();

    expect(screen.getByText(/waiting for the next ready worker/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    await flushAsyncWork();

    expect(screen.getByText(/active session/i)).toBeInTheDocument();
    expect(screen.getByText(/queued then active/i)).toBeInTheDocument();
  });

  it("loads prior conversation history on refresh", async () => {
    const session = buildSnapshot({
      sessionId: "session-3"
    });
    const conversation = buildConversation("session-3", {
      messages: [
        buildMessage({
          messageId: "user-1",
          role: "user",
          body: "Hello there"
        }),
        buildMessage({
          messageId: "assistant-1",
          role: "assistant",
          body: "Hi from the saved conversation"
        })
      ]
    });

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-3": {
          body: session
        },
        "GET /api/sessions/session-3/messages": {
          body: conversation
        }
      })
    );

    renderWithRoute("/session/session-3");

    await screen.findByText(/hello there/i);
    expect(
      screen.getByText(/hi from the saved conversation/i)
    ).toBeInTheDocument();
  });

  it("renders pending assistant state while waiting for a reply", async () => {
    const session = buildSnapshot({
      sessionId: "session-4"
    });
    const initialConversation = buildConversation("session-4");
    const pendingConversation = buildConversation("session-4", {
      canSend: false,
      pendingAssistantMessageId: "assistant-pending",
      messages: [
        buildMessage({
          messageId: "user-4",
          role: "user",
          body: "What should we cook?"
        }),
        buildMessage({
          messageId: "assistant-pending",
          role: "assistant",
          state: "pending",
          body: "",
          replyToMessageId: "user-4",
          completedAt: null
        })
      ]
    });

    const fetchMock = createFetchStub({
      "GET /api/session-bootstrap/session-4": {
        body: session
      },
      "GET /api/sessions/session-4/messages": {
        body: initialConversation
      },
      "POST /api/sessions/session-4/messages": {
        body: pendingConversation,
        status: 202
      }
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithRoute("/session/session-4");
    await screen.findByText(/active session/i);

    fireEvent.change(screen.getByLabelText(/message the assigned worker/i), {
      target: {
        value: "What should we cook?"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await screen.findAllByText(/assistant is replying/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/session-4/messages",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled();
  });

  it("replaces the pending bubble with the assistant reply after polling", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const session = buildSnapshot({
      sessionId: "session-5",
      endsAt: "2026-03-27T10:05:00.000Z"
    });
    const initialConversation = buildConversation("session-5");
    const pendingConversation = buildConversation("session-5", {
      canSend: false,
      pendingAssistantMessageId: "assistant-pending",
      messages: [
        buildMessage({
          messageId: "user-5",
          role: "user",
          body: "Tell me a joke"
        }),
        buildMessage({
          messageId: "assistant-pending",
          role: "assistant",
          state: "pending",
          body: "",
          replyToMessageId: "user-5",
          completedAt: null
        })
      ]
    });
    const finalConversation = buildConversation("session-5", {
      messages: [
        buildMessage({
          messageId: "user-5",
          role: "user",
          body: "Tell me a joke"
        }),
        buildMessage({
          messageId: "assistant-5",
          role: "assistant",
          body: "Here is the final answer"
        })
      ]
    });

    const fetchMock = createFetchStub({
      "GET /api/session-bootstrap/session-5": {
        body: session
      },
      "GET /api/sessions/session-5/messages": [
        {
          body: initialConversation
        },
        {
          body: finalConversation
        }
      ],
      "POST /api/sessions/session-5/messages": {
        body: pendingConversation,
        status: 202
      },
      "GET /api/sessions/session-5": {
        body: session
      }
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithRoute("/session/session-5");
    await flushAsyncWork();
    expect(screen.getByText(/active session/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/message the assigned worker/i), {
      target: {
        value: "Tell me a joke"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await flushAsyncWork();
    expect(screen.getAllByText(/assistant is replying/i).length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await flushAsyncWork();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/session-5/messages",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getByText(/here is the final answer/i)).toBeInTheDocument();
    expect(screen.queryByText(/^assistant is replying\.\.\.$/i)).not.toBeInTheDocument();
  });

  it("blocks send when the session is ended", async () => {
    const session = buildSnapshot({
      sessionId: "session-6",
      state: "ended",
      endedAt: "2026-03-27T10:30:00.000Z",
      endReason: "manual_end"
    });
    const conversation = buildConversation("session-6", {
      canSend: false,
      messages: [
        buildMessage({
          messageId: "user-6",
          role: "user",
          body: "Saved question"
        }),
        buildMessage({
          messageId: "assistant-6",
          role: "assistant",
          body: "Saved answer"
        })
      ]
    });

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-6": {
          body: session
        },
        "GET /api/sessions/session-6/messages": {
          body: conversation
        }
      })
    );

    renderWithRoute("/session/session-6");

    await screen.findByText(/saved question/i);
    expect(screen.getByText(/saved answer/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/this session is closed\. you can review history but cannot send more messages\./i)
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled();
  });
});
