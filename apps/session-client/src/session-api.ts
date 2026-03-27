import type { SessionSnapshot } from "./session-types";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;

    throw new Error(
      errorBody?.detail ?? errorBody?.error ?? `Request failed: ${response.status}`
    );
  }

  return (await response.json()) as T;
}

export function createSession(requestedForLabel: string): Promise<SessionSnapshot> {
  return apiRequest("/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      requestedForLabel
    })
  });
}

export function getSession(sessionId: string): Promise<SessionSnapshot> {
  return apiRequest(`/api/sessions/${sessionId}`);
}

export function getSessionBootstrap(sessionId: string): Promise<SessionSnapshot> {
  return apiRequest(`/api/session-bootstrap/${sessionId}`);
}

export function cancelSession(sessionId: string): Promise<SessionSnapshot> {
  return apiRequest(`/api/sessions/${sessionId}/cancel`, {
    method: "POST"
  });
}

export function endSession(sessionId: string): Promise<SessionSnapshot> {
  return apiRequest(`/api/sessions/${sessionId}/end`, {
    method: "POST"
  });
}
