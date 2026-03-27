import { startTransition, useState } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";

import { createSession } from "./session-api";
import {
  formatSessionEndReason,
  type SessionSnapshot
} from "./session-types";
import { useSessionView } from "./use-session-view";

function formatDuration(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1_000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function SessionShell({
  snapshot,
  remainingMs,
  onEndSession,
  isLoading
}: {
  snapshot: SessionSnapshot;
  remainingMs: number;
  onEndSession: () => Promise<void>;
  isLoading: boolean;
}) {
  const workerLabel = snapshot.worker?.displayName ?? snapshot.session.workerId ?? "Unassigned";

  return (
    <div className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">Shared Session Screen</p>
          <h2>{snapshot.session.requestedForLabel}</h2>
        </div>
        <div className="countdown-panel">
          <span>Remaining</span>
          <strong data-testid="countdown">{formatDuration(remainingMs)}</strong>
        </div>
      </div>

      <div className="shell-metadata">
        <span>Worker: {workerLabel}</span>
        <span>Status: {snapshot.session.state}</span>
      </div>

      <div className="history-panel">
        <div className="history-bubble system">
          <p className="bubble-role">System</p>
          <p>Phase 2 keeps the timed session contract visible here.</p>
        </div>
        <div className="history-bubble assistant">
          <p className="bubble-role">Assistant</p>
          <p>Chat relay arrives in Phase 3. This shell is intentionally read-only for now.</p>
        </div>
      </div>

      <div className="composer-panel">
        <label htmlFor="phase-3-message">Chat relay arrives in Phase 3</label>
        <textarea
          id="phase-3-message"
          disabled
          placeholder="Message sending unlocks in the next phase"
        />
        <button disabled type="button">
          Send
        </button>
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

  return (
    <section className="layout-grid">
      <div className="hero-panel">
        <p className="eyebrow">Operator Start Screen</p>
        <h1>Launch a one-hour ChatGPT slot for the shared screen.</h1>
        <p className="hero-copy">
          Start a timed household session, let the queue resolve automatically, and
          keep the browser worker hidden behind the application surface.
        </p>
      </div>

      <form
        className="form-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          setError(null);

          try {
            const snapshot = await createSession(requestedForLabel);
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
        <button disabled={isSubmitting} type="submit">
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
    error,
    isLoading,
    remainingMs,
    cancelQueuedSession,
    endActiveSession
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

  if (error && !snapshot) {
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

  if (snapshot.session.state === "queued") {
    return (
      <section className="state-card">
        <p className="eyebrow">Queued</p>
        <h1>Waiting for the next ready worker.</h1>
        <p>
          Queue position:{" "}
          <strong>{snapshot.queuePosition ?? "Unknown"}</strong>
        </p>
        <p className="helper-copy">
          The timer begins only after the session is activated on a worker.
        </p>
        {error ? <p className="error-text">{error}</p> : null}
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
      </section>
    );
  }

  if (snapshot.session.state === "active") {
    return (
      <section className="state-stack">
        <div className="status-banner active">
          <span>Active Session</span>
          <p>The shared screen is pinned to {snapshot.worker?.displayName ?? snapshot.session.workerId}.</p>
        </div>
        {error ? <p className="error-text inline">{error}</p> : null}
        <SessionShell
          isLoading={isLoading}
          onEndSession={endActiveSession}
          remainingMs={remainingMs}
          snapshot={snapshot}
        />
      </section>
    );
  }

  return (
    <section className="state-stack">
      <div className="status-banner ended">
        <span>Session Closed</span>
        <p>{formatSessionEndReason(snapshot.session.endReason)}</p>
      </div>
      {error ? <p className="error-text inline">{error}</p> : null}
      <SessionShell
        isLoading={isLoading}
        onEndSession={endActiveSession}
        remainingMs={0}
        snapshot={snapshot}
      />
      <Link className="ghost-link" to="/">
        Start another session
      </Link>
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
