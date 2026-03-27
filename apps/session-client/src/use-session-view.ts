import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState
} from "react";

import {
  cancelSession,
  endSession,
  getSession,
  getSessionBootstrap
} from "./session-api";
import type { SessionSnapshot } from "./session-types";

interface SessionViewState {
  snapshot: SessionSnapshot | null;
  error: string | null;
  isLoading: boolean;
  remainingMs: number;
  cancelQueuedSession: () => Promise<void>;
  endActiveSession: () => Promise<void>;
}

export function useSessionView(sessionId: string | undefined): SessionViewState {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [now, setNow] = useState(() => Date.now());

  const loadBootstrap = useEffectEvent(async () => {
    if (!sessionId) {
      return;
    }

    setIsLoading(true);

    try {
      const nextSnapshot = await getSessionBootstrap(sessionId);
      startTransition(() => {
        setSnapshot(nextSnapshot);
        setError(null);
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load the session"
      );
    } finally {
      setIsLoading(false);
    }
  });

  const pollSnapshot = useEffectEvent(async () => {
    if (!sessionId) {
      return;
    }

    try {
      const nextSnapshot = await getSession(sessionId);
      startTransition(() => {
        setSnapshot(nextSnapshot);
        setError(null);
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to refresh the session"
      );
    }
  });

  useEffect(() => {
    void loadBootstrap();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void pollSnapshot();
    }, 5_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (snapshot?.session.state !== "active" || !snapshot.session.endsAt) {
      setNow(Date.now());
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [snapshot?.session.endsAt, snapshot?.session.state]);

  const remainingMs =
    snapshot?.session.state === "active" && snapshot.session.endsAt
      ? Math.max(0, Date.parse(snapshot.session.endsAt) - now)
      : 0;

  return {
    snapshot,
    error,
    isLoading,
    remainingMs,
    cancelQueuedSession: async () => {
      if (!sessionId) {
        return;
      }

      setIsLoading(true);

      try {
        const nextSnapshot = await cancelSession(sessionId);
        startTransition(() => {
          setSnapshot(nextSnapshot);
          setError(null);
        });
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to cancel the queued session"
        );
      } finally {
        setIsLoading(false);
      }
    },
    endActiveSession: async () => {
      if (!sessionId) {
        return;
      }

      setIsLoading(true);

      try {
        const nextSnapshot = await endSession(sessionId);
        startTransition(() => {
          setSnapshot(nextSnapshot);
          setError(null);
        });
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to end the active session"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };
}
