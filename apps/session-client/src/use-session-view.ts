import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState
} from "react";

import {
  cancelSession,
  endSession,
  getConversation,
  getSession,
  getSessionBootstrap,
  sendMessage as postMessage
} from "./session-api";
import type {
  SessionConversationSnapshot,
  SessionMessageRecord,
  SessionSnapshot
} from "./session-types";

interface SessionViewState {
  snapshot: SessionSnapshot | null;
  conversation: SessionConversationSnapshot | null;
  messages: SessionMessageRecord[];
  pendingAssistantMessageId: string | null;
  canSend: boolean;
  error: string | null;
  composerError: string | null;
  isLoading: boolean;
  isSending: boolean;
  remainingMs: number;
  cancelQueuedSession: () => Promise<void>;
  endActiveSession: () => Promise<void>;
  sendMessage: (bodyText: string) => Promise<boolean>;
}

export function useSessionView(sessionId: string | undefined): SessionViewState {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [conversation, setConversation] =
    useState<SessionConversationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [isSending, setIsSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const hydrateView = useEffectEvent(
    async (
      loadSession: (
        currentSessionId: string
      ) => Promise<SessionSnapshot>
    ) => {
      if (!sessionId) {
        return;
      }

      const [nextSnapshot, nextConversation] = await Promise.all([
        loadSession(sessionId),
        getConversation(sessionId)
      ]);

      startTransition(() => {
        setSnapshot(nextSnapshot);
        setConversation(nextConversation);
        setError(null);

        if (nextConversation.canSend) {
          setComposerError(null);
        }
      });
    }
  );

  const loadBootstrap = useEffectEvent(async () => {
    if (!sessionId) {
      return;
    }

    setIsLoading(true);

    try {
      await hydrateView(getSessionBootstrap);
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
      await hydrateView(getSession);
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
    conversation,
    messages: conversation?.messages ?? [],
    pendingAssistantMessageId: conversation?.pendingAssistantMessageId ?? null,
    canSend: Boolean(conversation?.canSend) && !isSending,
    error,
    composerError,
    isLoading,
    isSending,
    remainingMs,
    cancelQueuedSession: async () => {
      if (!sessionId) {
        return;
      }

      setIsLoading(true);

      try {
        const [nextSnapshot, nextConversation] = await Promise.all([
          cancelSession(sessionId),
          getConversation(sessionId)
        ]);

        startTransition(() => {
          setSnapshot(nextSnapshot);
          setConversation(nextConversation);
          setError(null);
          setComposerError(null);
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
        const [nextSnapshot, nextConversation] = await Promise.all([
          endSession(sessionId),
          getConversation(sessionId)
        ]);

        startTransition(() => {
          setSnapshot(nextSnapshot);
          setConversation(nextConversation);
          setError(null);
          setComposerError(null);
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
    },
    sendMessage: async (bodyText: string) => {
      if (!sessionId) {
        return false;
      }

      setIsSending(true);

      try {
        const nextConversation = await postMessage(sessionId, bodyText);

        startTransition(() => {
          setConversation(nextConversation);
          setComposerError(null);
        });

        return true;
      } catch (mutationError) {
        setComposerError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to send the message"
        );
        return false;
      } finally {
        setIsSending(false);
      }
    }
  };
}
