import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "./app";
import {
  ACTIVE_SESSION_STORAGE_KEY
} from "./session-storage";
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
    relay: {
      status: "completed",
      attemptCount: 1,
      maxAttempts: 3,
      nextRetryAt: null,
      lastFailureCode: null,
      lastFailureClass: null
    },
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
  window.localStorage.clear();
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
    expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBe("session-1");
  });

  it("resumes the stored active session on app reload", async () => {
    const session = buildSnapshot({
      sessionId: "session-resume"
    });
    const conversation = buildConversation("session-resume", {
      messages: [
        buildMessage({
          messageId: "assistant-1",
          role: "assistant",
          body: "Recovered from storage"
        })
      ]
    });

    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, "session-resume");

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-resume": [
          {
            body: session
          },
          {
            body: session
          }
        ],
        "GET /api/sessions/session-resume/messages": {
          body: conversation
        }
      })
    );

    renderWithRoute("/");

    await screen.findByText(/active session/i);
    expect(screen.getByText(/recovered from storage/i)).toBeInTheDocument();
  });

  it("keeps the current history visible while reconnecting after a poll failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const session = buildSnapshot({
      sessionId: "session-reconnect",
      endsAt: "2026-03-27T10:10:00.000Z"
    });
    const conversation = buildConversation("session-reconnect", {
      messages: [
        buildMessage({
          messageId: "assistant-reconnect",
          role: "assistant",
          body: "Still visible while reconnecting"
        })
      ]
    });

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-reconnect": {
          body: session
        },
        "GET /api/sessions/session-reconnect/messages": [
          {
            body: conversation
          },
          {
            body: conversation
          }
        ],
        "GET /api/sessions/session-reconnect": {
          body: {
            error: "temporary_failure",
            detail: "Temporary poll failure"
          },
          status: 503
        }
      })
    );

    renderWithRoute("/session/session-reconnect");
    await flushAsyncWork();

    expect(
      screen.getByText(/still visible while reconnecting/i)
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await flushAsyncWork();

    expect(
      screen.getByText(/connection lost\. reconnecting to the current session/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/still visible while reconnecting/i)
    ).toBeInTheDocument();
  });

  it("shows relay retry status from the conversation snapshot", async () => {
    const session = buildSnapshot({
      sessionId: "session-retry"
    });
    const conversation = buildConversation("session-retry", {
      canSend: true,
      relay: {
        status: "retrying",
        attemptCount: 2,
        maxAttempts: 3,
        nextRetryAt: "2026-03-27T10:00:02.000Z",
        lastFailureCode: "worker_relay_unreachable",
        lastFailureClass: "transient"
      },
      messages: [
        buildMessage({
          messageId: "user-retry",
          role: "user",
          body: "Retry me"
        }),
        buildMessage({
          messageId: "assistant-retry",
          role: "assistant",
          state: "pending",
          body: "",
          replyToMessageId: "user-retry",
          completedAt: null
        })
      ]
    });

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-retry": {
          body: session
        },
        "GET /api/sessions/session-retry/messages": {
          body: conversation
        }
      })
    );

    renderWithRoute("/session/session-retry");

    await screen.findByText(/retrying assistant delivery/i);
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled();
  });

  it("clears stored session id when the session is terminal", async () => {
    const session = buildSnapshot({
      sessionId: "session-terminal",
      state: "ended",
      endedAt: "2026-03-27T10:30:00.000Z",
      endReason: "manual_end"
    });

    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, "session-terminal");

    vi.stubGlobal(
      "fetch",
      createFetchStub({
        "GET /api/session-bootstrap/session-terminal": {
          body: session
        }
      })
    );

    renderWithRoute("/");

    await waitFor(() => {
      expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: /start timed session/i })
    ).toBeInTheDocument();
  });
});
