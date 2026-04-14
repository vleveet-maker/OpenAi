import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ControlApiConfig } from "../src/config.js";
import { createControlApiApp, createControlApiRuntime } from "../src/server.js";
import { createReadyBootstrapTransport } from "./test-bootstrap-transport.js";

const tempDirectories: string[] = [];
const cleanupCallbacks: Array<() => void> = [];

function createTestRuntime() {
  const root = mkdtempSync(join(tmpdir(), "control-api-admin-page-"));
  tempDirectories.push(root);

  const config: ControlApiConfig = {
    serviceName: "control-api",
    host: "127.0.0.1",
    port: 0,
    internalAdminToken: "secret",
    hostControllerBaseUrl: undefined,
    hostControllerToken: undefined,
    autoStartHostWorkers: false,
    sessionDatabasePath: join(root, "session-routing.sqlite"),
    sessionDurationMinutes: 60,
    sessionSweepIntervalMs: 5_000,
    sessionClientDistPath: join(root, "missing-client-dist"),
    dockerSocketPath: "/var/run/docker.sock",
    workerHealthPollIntervalMs: 5_000,
    workerHealthTimeoutMs: 3_000,
    workerDefinitions: [
      {
        workerId: "dad",
        displayName: "Dad",
        containerName: "host-dad",
        profilePath: "/profiles/dad",
        agentBaseUrl: "http://host.docker.internal:4021",
        runtimeType: "host",
        defaultStatus: "ready"
      }
    ]
  };

  const dockerEngineClient = {
    restartContainer: vi.fn().mockResolvedValue(undefined),
    inspectContainer: vi.fn()
  };
  const healthMonitor = {
    startHealthMonitor: vi.fn(),
    stopHealthMonitor: vi.fn(),
    runHealthSweep: vi.fn().mockResolvedValue(undefined)
  };
  const runtime = createControlApiRuntime(config, {
    dockerEngineClient,
    healthMonitor,
    bootstrapTransport: createReadyBootstrapTransport()
  });
  const app = createControlApiApp(runtime);

  return {
    runtime,
    app
  };
}

afterEach(() => {
  vi.restoreAllMocks();

  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }

  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, {
        force: true,
        recursive: true
      });
    }
  }
});

describe("internal admin page", () => {
  it("renders compact-visible baseline controls and observability endpoints", async () => {
    const { app, runtime } = createTestRuntime();
    cleanupCallbacks.push(() => runtime.dispose());

    const response = await request(app)
      .get("/internal/admin")
      .set("x-internal-admin-token", "secret")
      .expect(200);

    expect(response.text).toContain("Start pool");
    expect(response.text).toContain("Start alternate desktop pool");
    expect(response.text).toContain("Stop pool");
    expect(response.text).toContain("Latest rollout smoke");
    expect(response.text).toContain("No rollout smoke captured yet.");
    expect(response.text).toContain("Latest readiness recovery");
    expect(response.text).toContain("No readiness recovery captured yet.");
    expect(response.text).toContain("Latest post-recovery smoke regression");
    expect(response.text).toContain("No post-recovery smoke regression captured yet.");
    expect(response.text).toContain("Latest zero-ready root cause");
    expect(response.text).toContain("No zero-ready root-cause result captured yet.");
    expect(response.text).toContain("Latest disconnected baseline remediation");
    expect(response.text).toContain("No disconnected baseline remediation captured yet.");
    expect(response.text).toContain("Latest post-remediation degraded smoke stabilization");
    expect(response.text).toContain("No post-remediation degraded smoke stabilization captured yet.");
    expect(response.text).toContain("Latest post-stabilization runtime investigation");
    expect(response.text).toContain("No post-stabilization runtime investigation captured yet.");
    expect(response.text).toContain("Latest disconnected runtime remediation");
    expect(response.text).toContain("No disconnected runtime remediation captured yet.");
    expect(response.text).toContain("Latest persistent disconnected runtime follow-up");
    expect(response.text).toContain("No persistent disconnected runtime follow-up captured yet.");
    expect(response.text).toContain("Latest runtime parity backport remediation");
    expect(response.text).toContain("No runtime parity backport remediation captured yet.");
    expect(response.text).toContain("Latest post-parity disconnected runtime remediation");
    expect(response.text).toContain("No post-parity disconnected runtime remediation captured yet.");
    expect(response.text).toContain("Latest post-phase21 disconnected runtime follow-up");
    expect(response.text).toContain("No post-phase21 disconnected runtime follow-up captured yet.");
    expect(response.text).toContain("Latest post-phase22 smoke-wrapper parity remediation");
    expect(response.text).toContain("No post-phase22 smoke-wrapper parity remediation captured yet.");
    expect(response.text).toContain("Latest post-phase23 exact smoke-wrapper compat remediation");
    expect(response.text).toContain("No post-phase23 exact smoke-wrapper compat remediation captured yet.");
    expect(response.text).toContain("Latest post-phase24 external API readiness");
    expect(response.text).toContain("No post-phase24 external API readiness result captured yet.");
    expect(response.text).toContain("Latest post-phase25 external restoration");
    expect(response.text).toContain("No post-phase25 external restoration result captured yet.");
    expect(response.text).toContain("Latest post-phase26 Ubuntu SSH recovery");
    expect(response.text).toContain("No post-phase26 Ubuntu SSH recovery result captured yet.");
    expect(response.text).toContain("Latest post-phase27 local proxy/bootstrap stabilization");
    expect(response.text).toContain("No post-phase27 local proxy/bootstrap result captured yet.");
    expect(response.text).toContain("Latest post-phase28 local proxy transport repair");
    expect(response.text).toContain("No post-phase28 local proxy transport result captured yet.");
    expect(response.text).toContain("Latest post-phase29 shared-2 chat 409");
    expect(response.text).toContain("No post-phase29 shared-2 chat 409 result captured yet.");
    expect(response.text).toContain("Latest post-phase30 shared-2 bootstrap recovery");
    expect(response.text).toContain("No post-phase30 shared-2 bootstrap recovery result captured yet.");
    expect(response.text).toContain("Latest post-phase31 local account surface inventory");
    expect(response.text).toContain("No post-phase31 local account surface inventory captured yet.");
    expect(response.text).toContain("Latest post-phase31 selected canary chat recovery");
    expect(response.text).toContain("No post-phase31 selected canary chat recovery captured yet.");
    expect(response.text).toContain("Latest post-phase32 rotating ready-account chat proof");
    expect(response.text).toContain("No post-phase32 rotating ready-account chat proof captured yet.");
    expect(response.text).toContain("Latest post-phase33 account browser isolation");
    expect(response.text).toContain("No post-phase33 account browser isolation captured yet.");
    expect(response.text).toContain("Latest post-phase33 isolated external chat proof");
    expect(response.text).toContain("No post-phase33 isolated external chat proof captured yet.");
    expect(response.text).toContain("Latest post-phase34 server isolated external chat proof");
    expect(response.text).toContain("No post-phase34 server isolated chat transfer captured yet.");
    expect(response.text).toContain("Start pool now uses compact visible fallback");
    expect(response.text).toContain("Routine runtime");
    expect(response.text).toContain("Routine window mode");
    expect(response.text).toContain("Start visible login");
    expect(response.text).toContain("Start visible reauth");
    expect(response.text).toContain("Complete login and validate");
    expect(response.text).toContain("Use compact visible runtime");
    expect(response.text).toContain("Start fresh-profile diagnostic");
    expect(response.text).toContain("Temporary profile does not delete the durable profile.");
    expect(response.text).toContain("Validate non-visible runtime");
    expect(response.text).toContain("Repeatability");
    expect(response.text).toContain("Alternate desktop");
    expect(response.text).toContain("Visible auth");
    expect(response.text).toContain("Compact visible");
    expect(response.text).toContain("architecture review required");
    expect(response.text).toContain("/internal/host-pool");
    expect(response.text).toContain("degraded");
    expect(response.text).toContain("failed");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/manual-auth/start");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/manual-auth/complete-compact-visible");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/manual-auth/complete-and-validate");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/diagnostic-profile/start");
    expect(response.text).toContain("/internal/workers/\" + workerId + \"/validate-runtime");
    expect(response.text).toContain("/internal/workers/");
    expect(response.text).toContain("/internal/observability/summary");
    expect(response.text).toContain("/internal/rollout-smoke/latest");
    expect(response.text).toContain("/internal/readiness-recovery/latest");
    expect(response.text).toContain("/internal/post-recovery-regression/latest");
    expect(response.text).toContain("/internal/zero-ready-root-cause/latest");
    expect(response.text).toContain("/internal/disconnected-baseline-remediation/latest");
    expect(response.text).toContain("/internal/post-remediation-degraded-smoke/latest");
    expect(response.text).toContain("/internal/post-stabilization-runtime-investigation/latest");
    expect(response.text).toContain("/internal/disconnected-runtime-remediation/latest");
    expect(response.text).toContain("/internal/persistent-disconnected-runtime-followup/latest");
    expect(response.text).toContain("/internal/runtime-parity-backport-remediation/latest");
    expect(response.text).toContain("/internal/post-parity-disconnected-runtime-remediation/latest");
    expect(response.text).toContain("/internal/post-phase21-disconnected-runtime-followup/latest");
    expect(response.text).toContain("/internal/post-phase22-smoke-wrapper-parity-remediation/latest");
    expect(response.text).toContain("/internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest");
    expect(response.text).toContain("/internal/post-phase24-external-api-readiness/latest");
    expect(response.text).toContain("/internal/post-phase25-external-restoration/latest");
    expect(response.text).toContain("/internal/post-phase26-ubuntu-ssh-recovery/latest");
    expect(response.text).toContain("/internal/post-phase27-local-proxy-bootstrap/latest");
    expect(response.text).toContain("/internal/post-phase28-local-proxy-transport/latest");
    expect(response.text).toContain("/internal/post-phase29-shared-2-chat-409/latest");
    expect(response.text).toContain("/internal/post-phase30-shared-2-bootstrap-recovery/latest");
    expect(response.text).toContain("/internal/post-phase31-account-surface-inventory/latest");
    expect(response.text).toContain("/internal/post-phase31-selected-canary-chat-recovery/latest");
    expect(response.text).toContain("/internal/post-phase32-rotating-ready-account-chat-proof/latest");
    expect(response.text).toContain("/internal/post-phase33-account-browser-isolation/latest");
    expect(response.text).toContain("/internal/post-phase33-isolated-external-chat-proof/latest");
    expect(response.text).toContain("/internal/post-phase34-server-isolated-chat-transfer/latest");
    expect(response.text).toContain("reauth_required");
    expect(response.text).toContain("reachable_but_unusable");
    expect(response.text).toContain("disconnected");
    expect(response.text).toContain("firstRegressionStage");
    expect(response.text).toContain("dominantBlockerClass");
    expect(response.text).toContain("firstFailingHop");
    expect(response.text).toContain("recoveredReadyCount");
    expect(response.text).toContain("dominantRemainingBlockerClass");
    expect(response.text).toContain("forced-Host hop");
    expect(response.text).toContain("public-owner hop");
    expect(response.text).toContain("preSmokeReadyCount");
    expect(response.text).toContain("finalSmokeReadyCount");
    expect(response.text).toContain("finalPoolStatus");
    expect(response.text).toContain("publicCanaryPassed");
    expect(response.text).toContain("preInvestigationReadyCount");
    expect(response.text).toContain("postCanaryReadyCount");
    expect(response.text).toContain("finalReadyCount");
    expect(response.text).toContain("dominantRuntimeBlocker");
    expect(response.text).toContain("firstFailingHop");
    expect(response.text).toContain("preRemediationReadyCount");
    expect(response.text).toContain("postRemediationReadyCount");
    expect(response.text).toContain("dominantRuntimeBlocker");
    expect(response.text).toContain("forcedHostStatus");
    expect(response.text).toContain("publicOwnerStatus");
    expect(response.text).toContain("loopbackStatus");
    expect(response.text).toContain("preFollowupReadyCount");
    expect(response.text).toContain("postFollowupReadyCount");
    expect(response.text).toContain("Latest persistent disconnected runtime follow-up loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest runtime parity backport remediation loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-parity disconnected runtime remediation loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase21 disconnected runtime follow-up loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase22 smoke-wrapper parity remediation loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase23 exact smoke-wrapper compat remediation loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase24 external API readiness loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase25 external restoration loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase26 Ubuntu SSH recovery loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase27 local proxy/bootstrap stabilization loaded from the internal latest-state artifact.");
    expect(response.text).toContain("parityBackportFiles");
    expect(response.text).toContain("smokeWrapperParityStatus");
    expect(response.text).toContain("smokeWrapperCompatStatus");
    expect(response.text).toContain("canonicalPublicUpstream");
    expect(response.text).toContain("reverseTunnelTaskStatus");
    expect(response.text).toContain("ubuntuTunnelListenerStatus");
    expect(response.text).toContain("readyWorkerCount");
    expect(response.text).toContain("scriptCompatibilityVersion");
    expect(response.text).toContain("ubuntu_public_owner");
    expect(response.text).toContain("ubuntuSshReachable");
    expect(response.text).toContain("externalHealthStatus");
    expect(response.text).toContain("externalModelsStatus");
    expect(response.text).toContain("externalChatStatus");
    expect(response.text).toContain("authenticatedSmokeTokenSource");
    expect(response.text).toContain("externalModelUsed");
    expect(response.text).toContain("sshFailureKind");
    expect(response.text).toContain("ubuntuRepoPath");
    expect(response.text).toContain("ubuntuRepoCommit");
    expect(response.text).toContain("authenticatedSmokeExecutionHost");
    expect(response.text).toContain("proxyTls allPassed");
    expect(response.text).toContain("proxyBackedBootstrap classification");
    expect(response.text).toContain("noProxyFallback classification");
    expect(response.text).toContain("4040 listener");
    expect(response.text).toContain("8081 listener");
    expect(response.text).toContain("4024 listener");
    expect(response.text).toContain("9225 listener");
    expect(response.text).toContain("apiTokenSource");
    expect(response.text).toContain("proxyMixedStatus");
    expect(response.text).toContain("manualShareLinksRefreshPerformed");
    expect(response.text).toContain("outboundDiagnostics count");
    expect(response.text).toContain("outbound tags");
    expect(response.text).toContain("proxyBackedRuntime classification");
    expect(response.text).toContain("noProxyFallbackRuntime classification");
    expect(response.text).toContain("runtimePathUsed");
    expect(response.text).toContain("assistant reply");
    expect(response.text).toContain("token source");
    expect(response.text).toContain("Latest post-phase28 local proxy transport repair loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase29 shared-2 chat 409 loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase30 shared-2 bootstrap recovery loaded from the internal latest-state artifact.");
    expect(response.text).toContain("exact409Classification");
    expect(response.text).toContain("exactBootstrapClassification");
    expect(response.text).toContain("recoveryBranch");
    expect(response.text).toContain("publicRerunBlockedReason");
    expect(response.text).toContain("truth reconciliation");
    expect(response.text).toContain("dialogSurfaceMarkers");
    expect(response.text).toContain("external chat errorCode");
    expect(response.text).toContain("temporaryReverseTunnelStatus");
    expect(response.text).toContain("nextCanary");
    expect(response.text).toContain("needs_manual_confirm");
    expect(response.text).toContain("acceptableAsNextCanary");
    expect(response.text).toContain("Latest post-phase31 local account surface inventory loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase31 selected canary chat recovery loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase32 rotating ready-account chat proof loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase33 account browser isolation loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase33 isolated external chat proof loaded from the internal latest-state artifact.");
    expect(response.text).toContain("Latest post-phase34 server isolated external chat proof loaded from the internal latest-state artifact.");
    expect(response.text).toContain("selectedCanaryClassification");
    expect(response.text).toContain("runtimeUsability");
    expect(response.text).toContain("shared2Deferred");
    expect(response.text).toContain("truth reconciliation");
    expect(response.text).toContain("candidateOrder");
    expect(response.text).toContain("attemptedWorkers");
    expect(response.text).toContain("successfulWorkerId");
    expect(response.text).toContain("commonBlocker");
    expect(response.text).toContain("manualInspectionReady");
    expect(response.text).toContain("successfulIsolationCount");
    expect(response.text).toContain("browserRootBasePath");
    expect(response.text).toContain("duplicateBrowserRoots");
    expect(response.text).toContain("token source");
    expect(response.text).toContain("exhaustionReason");
    expect(response.text).toContain("Windows commit");
    expect(response.text).toContain("Ubuntu commit");
    expect(response.text).toContain("serverAccountInventory count");
    expect(response.text).toContain("copyResult");
    expect(response.text).toContain("shared-6");
  });
});
