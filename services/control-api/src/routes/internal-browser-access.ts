import { randomUUID } from "node:crypto";

import { Router, type Request } from "express";

import type { OperatorEventRecorder } from "../observability/operator-events.js";
import type { SessionService } from "../sessions/session-service.js";
import type { WorkerRecord, WorkerRegistry } from "../workers/worker-registry.js";

export type InternalBrowserAccessMode = "first_login" | "reauth";

export type InternalBrowserAccessStatus =
  | "requested"
  | "browser_ready"
  | "waiting_for_operator"
  | "completed"
  | "expired"
  | "cancelled";

export interface InternalBrowserAccessSession {
  sessionId: string;
  accessToken: string;
  workerId: string;
  mode: InternalBrowserAccessMode;
  status: InternalBrowserAccessStatus;
  startedAt: string;
  expiresAt: string;
  viewerPath: string;
}

export interface InternalBrowserAccessServiceOptions {
  workerRegistry: WorkerRegistry;
  sessionService: Pick<SessionService, "handleWorkerReady" | "handleWorkerStatusChange">;
  eventRecorder?: OperatorEventRecorder;
  sessions?: Map<string, InternalBrowserAccessSession>;
  ttlMinutes?: number;
  now?: () => Date;
}

export interface InternalBrowserAccessRouterOptions {
  service: InternalBrowserAccessService;
}

const ACTIVE_BROWSER_ACCESS_STATUSES = new Set<InternalBrowserAccessStatus>([
  "requested",
  "browser_ready",
  "waiting_for_operator"
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseBrowserAccessMode(value: unknown): InternalBrowserAccessMode | null {
  return value === "first_login" || value === "reauth" ? value : null;
}

function buildViewerPath(
  workerId: string,
  sessionId: string,
  accessToken: string
): string {
  const websockifyPath = encodeURIComponent(
    `internal/browser/${workerId}/websockify?sessionId=${sessionId}&accessToken=${accessToken}`
  );

  return `/internal/browser/${workerId}/vnc_lite.html?path=${websockifyPath}&autoconnect=true&resize=remote&sessionId=${sessionId}&accessToken=${accessToken}`;
}

function cloneBrowserAccessSession(
  session: InternalBrowserAccessSession
): InternalBrowserAccessSession {
  return {
    ...session
  };
}

function readBrowserAccessString(
  request: Request,
  queryKey: "workerId" | "sessionId" | "accessToken",
  headerName: string
): string | null {
  const headerValue = request.header(headerName);

  if (isNonEmptyString(headerValue)) {
    return headerValue.trim();
  }

  const queryValue = request.query[queryKey];
  return isNonEmptyString(queryValue) ? queryValue.trim() : null;
}

export class InternalBrowserAccessService {
  private readonly sessions: Map<string, InternalBrowserAccessSession>;
  private readonly ttlMinutes: number;
  private readonly now: () => Date;

  constructor(private readonly options: InternalBrowserAccessServiceOptions) {
    this.sessions = options.sessions ?? new Map<string, InternalBrowserAccessSession>();
    this.ttlMinutes = options.ttlMinutes ?? 15;
    this.now = options.now ?? (() => new Date());
  }

  startSession(
    workerId: string,
    mode: InternalBrowserAccessMode
  ): {
    worker: WorkerRecord;
    browserAccess: InternalBrowserAccessSession;
  } {
    this.requireWorker(workerId);
    const now = this.now();
    const existingSession = this.getSession(workerId, now);

    if (
      existingSession &&
      this.isSessionActive(existingSession, now) &&
      existingSession.mode === mode
    ) {
      return {
        worker: this.requireWorker(workerId),
        browserAccess: existingSession
      };
    }

    const startedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + this.ttlMinutes * 60_000).toISOString();
    const session: InternalBrowserAccessSession = {
      sessionId: randomUUID(),
      accessToken: randomUUID(),
      workerId,
      mode,
      status: "browser_ready",
      startedAt,
      expiresAt,
      viewerPath: buildViewerPath(workerId, "", "")
    };
    const finalizedSession: InternalBrowserAccessSession = {
      ...session,
      viewerPath: buildViewerPath(workerId, session.sessionId, session.accessToken)
    };

    this.sessions.set(workerId, finalizedSession);

    if (mode === "reauth") {
      this.options.workerRegistry.updateWorker(workerId, {
        status: "reauth_required",
        reason: "manual operator reauth requested",
        recoverySessionId: finalizedSession.sessionId
      });
      this.options.sessionService.handleWorkerStatusChange(workerId, now);
      this.options.eventRecorder?.recordEvent({
        eventType: "worker_reauth_started",
        severity: "warn",
        workerId,
        summary: `Worker ${workerId} manual reauthentication started`,
        detailJson: JSON.stringify({
          recoverySessionId: finalizedSession.sessionId,
          mode,
          expiresAt
        }),
        occurredAt: startedAt
      });
    } else {
      this.options.workerRegistry.updateWorker(workerId, {
        recoverySessionId: finalizedSession.sessionId
      });
    }

    return {
      worker: this.requireWorker(workerId),
      browserAccess: finalizedSession
    };
  }

  getSession(
    workerId: string,
    now: Date = this.now()
  ): InternalBrowserAccessSession | undefined {
    const session = this.sessions.get(workerId);

    if (!session) {
      return undefined;
    }

    if (this.isSessionExpired(session, now) && session.status !== "expired") {
      const expiredSession: InternalBrowserAccessSession = {
        ...session,
        status: "expired"
      };
      this.sessions.set(workerId, expiredSession);
      this.clearRecoverySessionReference(workerId, expiredSession.sessionId);
      return cloneBrowserAccessSession(expiredSession);
    }

    return cloneBrowserAccessSession(session);
  }

  cancelSession(
    workerId: string
  ): {
    worker: WorkerRecord;
    browserAccess: InternalBrowserAccessSession;
  } {
    const worker = this.requireWorker(workerId);
    const session = this.requireActiveSession(workerId);
    const cancelledSession: InternalBrowserAccessSession = {
      ...session,
      status: "cancelled"
    };

    this.sessions.set(workerId, cancelledSession);
    this.clearRecoverySessionReference(workerId, cancelledSession.sessionId);

    return {
      worker,
      browserAccess: cloneBrowserAccessSession(cancelledSession)
    };
  }

  completeSession(
    workerId: string
  ): {
    worker: WorkerRecord;
    browserAccess: InternalBrowserAccessSession;
  } {
    this.requireWorker(workerId);
    const now = this.now();
    const session = this.requireActiveSession(workerId, now);
    const completedAt = now.toISOString();
    const completedSession: InternalBrowserAccessSession = {
      ...session,
      status: "completed"
    };

    this.sessions.set(workerId, completedSession);
    const worker = this.options.workerRegistry.updateWorker(workerId, {
      status: "ready",
      reason:
        session.mode === "reauth"
          ? "operator finished manual reauth"
          : "operator finished manual login",
      runtimeStatus: "ready",
      runtimeCapability: "reachable_but_unusable",
      recoverySessionId: null
    });
    this.options.sessionService.handleWorkerReady(now);

    if (session.mode === "reauth") {
      this.options.eventRecorder?.recordEvent({
        eventType: "worker_reauth_completed",
        severity: "info",
        workerId,
        summary: `Worker ${workerId} manual reauthentication completed`,
        detailJson: JSON.stringify({
          recoverySessionId: completedSession.sessionId,
          completedAt
        }),
        occurredAt: completedAt
      });
    }

    return {
      worker,
      browserAccess: cloneBrowserAccessSession(completedSession)
    };
  }

  authorize(
    workerId: string | null,
    sessionId: string | null,
    accessToken: string | null
  ): boolean {
    if (!workerId || !sessionId || !accessToken) {
      return false;
    }

    const session = this.getSession(workerId, this.now());

    return Boolean(
      session &&
        this.isSessionActive(session) &&
        session.sessionId === sessionId &&
        session.accessToken === accessToken
    );
  }

  private requireWorker(workerId: string): WorkerRecord {
    const worker = this.options.workerRegistry.getWorker(workerId);

    if (!worker) {
      throw new Error(`worker_not_found:${workerId}`);
    }

    return worker;
  }

  private requireSession(
    workerId: string,
    now: Date = this.now()
  ): InternalBrowserAccessSession {
    const session = this.getSession(workerId, now);

    if (!session) {
      throw new Error(`browser_access_not_found:${workerId}`);
    }

    return session;
  }

  private requireActiveSession(
    workerId: string,
    now: Date = this.now()
  ): InternalBrowserAccessSession {
    const session = this.requireSession(workerId, now);

    if (!this.isSessionActive(session, now)) {
      throw new Error(`browser_access_inactive:${workerId}`);
    }

    return session;
  }

  private isSessionActive(
    session: InternalBrowserAccessSession,
    now: Date = this.now()
  ): boolean {
    return (
      ACTIVE_BROWSER_ACCESS_STATUSES.has(session.status) &&
      !this.isSessionExpired(session, now)
    );
  }

  private isSessionExpired(
    session: InternalBrowserAccessSession,
    now: Date
  ): boolean {
    return now.toISOString() >= session.expiresAt;
  }

  private clearRecoverySessionReference(workerId: string, sessionId: string): void {
    const worker = this.options.workerRegistry.getWorker(workerId);

    if (worker?.recoverySessionId === sessionId) {
      this.options.workerRegistry.updateWorker(workerId, {
        recoverySessionId: null
      });
    }
  }
}

export function createInternalBrowserAccessService(
  options: InternalBrowserAccessServiceOptions
): InternalBrowserAccessService {
  return new InternalBrowserAccessService(options);
}

export function createInternalBrowserAccessRouter(
  options: InternalBrowserAccessRouterOptions
) {
  const router = Router();

  router.post("/internal/workers/:id/browser-access/start", (request, response) => {
    const mode = parseBrowserAccessMode(request.body?.mode);

    if (!mode) {
      response.status(400).json({
        error: "invalid_browser_access_mode",
        detail: 'mode must be "first_login" or "reauth"'
      });
      return;
    }

    try {
      const result = options.service.startSession(request.params.id, mode);

      response.status(202).json({
        workerId: result.worker.workerId,
        browserAccess: result.browserAccess,
        viewerPath: result.browserAccess.viewerPath,
        manualLoginRequired: true
      });
    } catch (error) {
      response.status(404).json({
        error: "worker_not_found",
        workerId: request.params.id,
        detail: error instanceof Error ? error.message : "Unknown worker"
      });
    }
  });

  router.get("/internal/workers/:id/browser-access", (request, response) => {
    const workerSession = options.service.getSession(request.params.id);

    if (!workerSession) {
      response.status(404).json({
        error: "browser_access_not_found",
        workerId: request.params.id
      });
      return;
    }

    response.json({
      workerId: request.params.id,
      browserAccess: workerSession,
      viewerPath: workerSession.viewerPath
    });
  });

  router.post("/internal/workers/:id/browser-access/cancel", (request, response) => {
    try {
      const result = options.service.cancelSession(request.params.id);

      response.status(202).json({
        workerId: request.params.id,
        browserAccess: result.browserAccess,
        worker: result.worker
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      const status = detail.startsWith("browser_access_inactive:") ? 409 : 404;

      response.status(status).json({
        error:
          detail.startsWith("worker_not_found:")
            ? "worker_not_found"
            : detail.startsWith("browser_access_inactive:")
              ? "browser_access_inactive"
              : "browser_access_not_found",
        workerId: request.params.id
      });
    }
  });

  router.post("/internal/workers/:id/browser-access/complete", (request, response) => {
    try {
      const result = options.service.completeSession(request.params.id);

      response.status(202).json({
        workerId: request.params.id,
        browserAccess: result.browserAccess,
        worker: result.worker
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      const status = detail.startsWith("browser_access_inactive:") ? 409 : 404;

      response.status(status).json({
        error:
          detail.startsWith("worker_not_found:")
            ? "worker_not_found"
            : detail.startsWith("browser_access_inactive:")
              ? "browser_access_inactive"
              : "browser_access_not_found",
        workerId: request.params.id
      });
    }
  });

  router.get("/internal/browser-access/authorize", (request, response) => {
    const workerId = readBrowserAccessString(
      request,
      "workerId",
      "x-browser-worker-id"
    );
    const sessionId = readBrowserAccessString(
      request,
      "sessionId",
      "x-browser-session-id"
    );
    const accessToken = readBrowserAccessString(
      request,
      "accessToken",
      "x-browser-access-token"
    );

    if (options.service.authorize(workerId, sessionId, accessToken)) {
      response.sendStatus(204);
      return;
    }

    response.sendStatus(403);
  });

  return router;
}
