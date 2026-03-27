export const ACTIVE_SESSION_STORAGE_KEY = "one-hour.activeSessionId";

export function getStoredSessionId(): string | null {
  const storedValue = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
  const trimmedValue = storedValue?.trim() ?? "";

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function storeSessionId(sessionId: string): void {
  window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
}

export function clearStoredSessionId(): void {
  window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
}
