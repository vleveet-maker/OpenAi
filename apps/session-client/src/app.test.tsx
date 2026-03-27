import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "./app";
import type { SessionSnapshot } from "./session-types";

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

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    },
    status: 200
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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Session client app", () => {
  it("creates a session from the start screen and resumes it", async () => {
    const session = buildSnapshot({
      sessionId: "session-1"
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(session))
      .mockResolvedValueOnce(createJsonResponse(session));

    vi.stubGlobal("fetch", fetchMock);

    renderWithRoute("/");

    fireEvent.change(screen.getByLabelText(/who is this hour for/i), {
      target: {
        value: "Evening Shared Session"
      }
    });
    fireEvent.submit(screen.getByRole("button", { name: /start timed session/i }));

    await screen.findByText(/active session/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({
        method: "POST"
      })
    );
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(queued))
      .mockResolvedValueOnce(createJsonResponse(active));

    vi.stubGlobal("fetch", fetchMock);

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

  it("renders a live countdown from endsAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T10:00:00.000Z"));

    const session = buildSnapshot({
      sessionId: "session-3",
      endsAt: "2026-03-27T10:01:05.000Z"
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse(session))
    );

    renderWithRoute("/session/session-3");
    await flushAsyncWork();

    expect(screen.getByText(/active session/i)).toBeInTheDocument();
    expect(screen.getByTestId("countdown")).toHaveTextContent("01:05");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId("countdown")).toHaveTextContent("01:04");
  });

  it("ends an active session and keeps the shell visible", async () => {
    const active = buildSnapshot({
      sessionId: "session-4"
    });
    const ended = buildSnapshot({
      sessionId: "session-4",
      state: "ended",
      endedAt: "2026-03-27T10:30:00.000Z",
      endReason: "manual_end"
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(active))
      .mockResolvedValueOnce(createJsonResponse(ended));

    vi.stubGlobal("fetch", fetchMock);

    renderWithRoute("/session/session-4");

    await screen.findByText(/active session/i);
    fireEvent.click(screen.getByRole("button", { name: /end session now/i }));

    await screen.findByText(/session closed/i);
    expect(screen.getByText(/session ended manually/i)).toBeInTheDocument();
    expect(screen.getByTestId("countdown")).toHaveTextContent("00:00");
  });

  it("restores a session by id and shows the phase 3 placeholder shell", async () => {
    const session = buildSnapshot({
      sessionId: "session-5"
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse(session))
    );

    renderWithRoute("/session/session-5");
    await waitFor(async () => {
      await flushAsyncWork();
      expect(
        screen.getByLabelText(/chat relay arrives in phase 3/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/message sending unlocks/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
