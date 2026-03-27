import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState
} from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";

import {
  createSession,
  getSessionBootstrap
} from "./session-api";
import {
  clearStoredSessionId,
  getStoredSessionId,
  storeSessionId
} from "./session-storage";
import {
  formatFailedAssistantMessage,
  formatSessionEndReason,
  type SessionConversationSnapshot,
  type SessionSnapshot
} from "./session-types";
import { useSessionView } from "./use-session-view";

function formatDuration(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1_000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatCountdown(snapshot: SessionSnapshot, remainingMs: number): string {
  if (snapshot.session.state === "queued") {
    return "--:--";
  }

  if (snapshot.session.state === "active") {
    return formatDuration(remainingMs);
  }

  return "00:00";
}

function getComposerMessage(
  snapshot: SessionSnapshot,
  conversation: SessionConversationSnapshot | null,
  connectionState: "connected" | "reconnecting" | "initial_load_failed"
): string {
  if (connectionState !== "connected") {
    return "Connection is restoring before sending is available.";
  }

  if (conversation?.relay.status === "retrying") {
    return "Assistant delivery is retrying. Wait for the current attempt to finish.";
  }

  if (snapshot.session.state === "queued") {
    return "Sending is blocked until the session is active.";
  }

  if (snapshot.session.state !== "active") {
    return "This session is closed. You can review history but cannot send more messages.";
  }

  if (conversation?.pendingAssistantMessageId) {
    return "Assistant is replying...";
  }

  if (!conversation?.canSend) {
    return "Sending is temporarily unavailable.";
  }

  return "Message the assigned worker";
}

function renderMessageBody(body: string, fallback: string): string {
  const trimmedBody = body.trim();
  return trimmedBody.length > 0 ? trimmedBody : fallback;
}

function SessionShell({
  snapshot,
  conversation,
  messages,
  remainingMs,
  canSend,
  isLoading,
  isSending,
  composerError,
  connectionState,
  onEndSession,
  onSendMessage
}: {
  snapshot: SessionSnapshot;
  conversation: SessionConversationSnapshot | null;
  messages: SessionConversationSnapshot["messages"];
  remainingMs: number;
  canSend: boolean;
  isLoading: boolean;
  isSending: boolean;
  composerError: string | null;
  connectionState: "connected" | "reconnecting" | "initial_load_failed";
  onEndSession: () => Promise<void>;
  onSendMessage: (bodyText: string) => Promise<boolean>;
}) {
  const workerLabel = snapshot.worker?.displayName ?? snapshot.session.workerId ?? "Unassigned";
  const [draft, setDraft] = useState("");
  const composerMessage = getComposerMessage(
    snapshot,
    conversation,
    connectionState
  );

  return (
    <div className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">Shared Session Screen</p>
          <h2>{snapshot.session.requestedForLabel}</h2>
        </div>
        <div className="countdown-panel">
          <span>{snapshot.session.state === "queued" ? "Starts when active" : "Remaining"}</span>
          <strong data-testid="countdown">{formatCountdown(snapshot, remainingMs)}</strong>
        </div>
      </div>

      <div className="shell-metadata">
        <span>Worker: {workerLabel}</span>
        <span>Status: {snapshot.session.state}</span>
        {snapshot.session.state === "queued" ? (
          <span>Queue position: {snapshot.queuePosition ?? "Unknown"}</span>
        ) : null}
      </div>

      <div className="history-panel">
        {messages.length === 0 ? (
          <div className="history-bubble system history-empty">
            <p className="bubble-role">System</p>
            <p>
              {snapshot.session.state === "active"
                ? "The shared screen is ready. Send the first message when you are ready."
                : "No messages yet. Conversation history will appear here for this session."}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              className={`history-bubble ${message.role} ${message.state}`}
              key={message.messageId}
            >
              <p className="bubble-role">
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              <p>
                {message.state === "pending"
                  ? "Assistant is replying..."
                  : message.state === "failed"
                    ? formatFailedAssistantMessage(message.failureCode)
                    : renderMessageBody(
                        message.body,
                        message.role === "assistant"
                          ? "Assistant is replying..."
                          : "Message unavailable"
                      )}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="composer-panel">
        <label htmlFor="phase-3-message">{composerMessage}</label>
        <textarea
          id="phase-3-message"
          disabled={!canSend}
          maxLength={4_000}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          placeholder={
            canSend
              ? "Type a message for the assigned ChatGPT worker"
              : composerMessage
          }
          value={draft}
        />
        <button
          disabled={!canSend || draft.trim().length === 0}
          onClick={async () => {
            const sent = await onSendMessage(draft);

            if (sent) {
              setDraft("");
            }
          }}
          type="button"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
        {composerError ? <p className="error-text">{composerError}</p> : null}
      </div>

      {snapshot.session.state === "active" ? (
        <button
          className="danger-button"
          disabled={isLoading}
          onClick={() => {
            void onEndSession();
          }}
          type="button"
        >
          End Session Now
        </button>
      ) : null}
    </div>
  );
}

function StartSessionPage() {
  const navigate = useNavigate();
  const [requestedForLabel, setRequestedForLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStoredSession, setIsCheckingStoredSession] = useState(true);

  const resumeStoredSession = useEffectEvent(async () => {
    const storedSessionId = getStoredSessionId();

    if (!storedSessionId) {
      setIsCheckingStoredSession(false);
      return;
    }

    try {
      const snapshot = await getSessionBootstrap(storedSessionId);

      if (snapshot.session.state === "queued" || snapshot.session.state === "active") {
        startTransition(() => {
          navigate(`/session/${storedSessionId}`);
        });
        return;
      }

      clearStoredSessionId();
    } catch {
      // Keep the stored id for a future reconnect attempt if bootstrap fails transiently.
    } finally {
      setIsCheckingStoredSession(false);
    }
  });

  useEffect(() => {
    void resumeStoredSession();
  }, []);

  return (
    <section className="layout-grid">
      <div className="hero-panel">
        <p className="eyebrow">Operator Start Screen</p>
        <h1>Launch a one-hour ChatGPT slot for the shared screen.</h1>
        <p className="hero-copy">
          Start a timed household session, let the queue resolve automatically, and
          keep the browser worker hidden behind the application surface.
        </p>
        {isCheckingStoredSession ? (
          <p className="helper-copy">Checking for a resumable shared-screen session...</p>
        ) : null}
      </div>

      <form
        className="form-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          setError(null);

          try {
            const snapshot = await createSession(requestedForLabel);
            storeSessionId(snapshot.session.sessionId);

            startTransition(() => {
              navigate(`/session/${snapshot.session.sessionId}`);
            });
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : "Failed to create the session"
            );
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <p className="eyebrow">Shared Device Only</p>
        <label htmlFor="requestedForLabel">Who is this hour for?</label>
        <input
          id="requestedForLabel"
          maxLength={64}
          onChange={(event) => {
            setRequestedForLabel(event.target.value);
          }}
          placeholder="Dad, Wife, Shared Evening Chat..."
          value={requestedForLabel}
        />
        <button disabled={isSubmitting || isCheckingStoredSession} type="submit">
          {isSubmitting ? "Starting..." : "Start Timed Session"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </section>
  );
}

function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    snapshot,
    messages,
    conversation,
    canSend,
    error,
    composerError,
    isLoading,
    isSending,
    remainingMs,
    connectionState,
    cancelQueuedSession,
    endActiveSession,
    sendMessage
  } = useSessionView(sessionId);

  if (!sessionId) {
    return (
      <section className="state-card">
        <h1>Session missing</h1>
        <p>This page needs a session id in the URL.</p>
      </section>
    );
  }

  if (isLoading && !snapshot) {
    return (
      <section className="state-card">
        <p className="eyebrow">Loading Session</p>
        <h1>Restoring the timed session...</h1>
      </section>
    );
  }

  if (connectionState === "initial_load_failed" && error && !snapshot) {
    return (
      <section className="state-card">
        <p className="eyebrow">Session Error</p>
        <h1>We could not restore this session.</h1>
        <p>{error}</p>
        <Link className="ghost-link" to="/">
          Return to start
        </Link>
      </section>
    );
  }

  if (!snapshot) {
    return null;
  }

  const relayStatus = conversation?.relay.status ?? "idle";
  const reconnecting = connectionState === "reconnecting";
  const composerBlocked =
    connectionState !== "connected" || relayStatus === "retrying";
  const shellCanSend = canSend && !composerBlocked;

  return (
    <section className="state-stack">
      {snapshot.session.state === "queued" ? (
        <div className="status-banner queued">
          <span>Queued</span>
          <p>
            Waiting for the next ready worker. Queue position:{" "}
            <strong>{snapshot.queuePosition ?? "Unknown"}</strong>
          </p>
        </div>
      ) : null}

      {snapshot.session.state === "active" ? (
        <div className="status-banner active">
          <span>Active Session</span>
          <p>The shared screen is pinned to {snapshot.worker?.displayName ?? snapshot.session.workerId}.</p>
        </div>
      ) : null}

      {snapshot.session.state !== "queued" && snapshot.session.state !== "active" ? (
        <div className="status-banner ended">
          <span>Session Closed</span>
          <p>{formatSessionEndReason(snapshot.session.endReason)}</p>
        </div>
      ) : null}

      {reconnecting ? (
        <div className="status-banner reconnecting">
          <span>Reconnect</span>
          <p>Connection lost. Reconnecting to the current session...</p>
        </div>
      ) : null}

      {conversation?.relay.status === "retrying" ? (
        <div className="status-banner retrying">
          <span>Relay Retry</span>
          <p>
            Retrying assistant delivery
            {" "}
            <strong>
              {conversation.relay.attemptCount}/{conversation.relay.maxAttempts}
            </strong>
          </p>
        </div>
      ) : null}

      {conversation?.relay.status === "failed" ? (
        <div className="status-banner failed">
          <span>Relay Failed</span>
          <p>Reply delivery failed</p>
        </div>
      ) : null}

      {error && connectionState === "connected" ? (
        <p className="error-text inline">{error}</p>
      ) : null}

      <SessionShell
        canSend={shellCanSend}
        composerError={composerError}
        connectionState={connectionState}
        conversation={conversation}
        isLoading={isLoading}
        isSending={isSending}
        messages={messages}
        onEndSession={endActiveSession}
        onSendMessage={sendMessage}
        remainingMs={snapshot.session.state === "active" ? remainingMs : 0}
        snapshot={snapshot}
      />

      {snapshot.session.state === "queued" ? (
        <div className="button-row">
          <button
            className="ghost-button"
            disabled={isLoading}
            onClick={() => {
              void cancelQueuedSession();
            }}
            type="button"
          >
            Cancel Queue Entry
          </button>
        </div>
      ) : null}

      {snapshot.session.state !== "queued" && snapshot.session.state !== "active" ? (
        <Link className="ghost-link" to="/">
          Start another session
        </Link>
      ) : null}
    </section>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<StartSessionPage />} path="/" />
      <Route element={<SessionPage />} path="/session/:sessionId" />
    </Routes>
  );
}

export function SessionClientApp() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
