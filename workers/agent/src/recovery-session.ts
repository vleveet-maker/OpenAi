export const RECOVERY_SESSION_STATUSES = [
  "requested",
  "browser_ready",
  "waiting_for_operator",
  "completed",
  "expired",
  "cancelled"
] as const;

export type RecoverySessionStatus =
  (typeof RECOVERY_SESSION_STATUSES)[number];

export interface RecoverySession {
  sessionId: string;
  workerId: string;
  startedAt: string;
  expiresAt: string;
  status: RecoverySessionStatus;
  mode: "first_login" | "reauth";
}

export interface RecoverySessionOptions {
  workerId: string;
  mode?: "first_login" | "reauth";
  ttlMinutes?: number;
  now?: Date;
}

export function createRecoverySession(
  options: RecoverySessionOptions
): RecoverySession {
  const now = options.now ?? new Date();
  const ttlMinutes = options.ttlMinutes ?? 15;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);

  return {
    sessionId: `recovery-${options.workerId}-${now.getTime()}`,
    workerId: options.workerId,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "requested",
    mode: options.mode ?? "reauth"
  };
}

export function updateRecoverySessionStatus(
  session: RecoverySession,
  status: RecoverySessionStatus
): RecoverySession {
  return {
    ...session,
    status
  };
}

export function isRecoverySessionExpired(
  session: RecoverySession,
  now: Date = new Date()
): boolean {
  return now.toISOString() >= session.expiresAt;
}
