import { Router } from "express";

function renderInternalAdminPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Operator Admin</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        background: linear-gradient(135deg, #f7f4ec 0%, #eef4f8 100%);
        color: #1f2933;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      main {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }

      header {
        margin-bottom: 24px;
      }

      h1 {
        margin: 0 0 10px;
        font-size: clamp(2rem, 4vw, 2.8rem);
      }

      header p {
        margin: 0;
        max-width: 760px;
        color: #52606d;
      }

      .status-bar {
        margin-top: 16px;
        padding: 12px 16px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(82, 96, 109, 0.15);
        font-size: 0.95rem;
      }

      .grid {
        display: grid;
        gap: 18px;
      }

      section {
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(31, 41, 51, 0.08);
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 14px 34px rgba(31, 41, 51, 0.08);
      }

      h2 {
        margin: 0 0 14px;
        font-size: 1.25rem;
      }

      .counts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin: 0 0 18px;
      }

      .pool-panel {
        display: grid;
        gap: 16px;
      }

      .pool-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .pool-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .count-card,
      .worker-card {
        padding: 14px;
        border-radius: 14px;
        background: #f7fafc;
        border: 1px solid rgba(82, 96, 109, 0.12);
      }

      .count-card strong {
        display: block;
        font-size: 1.4rem;
        margin-bottom: 4px;
      }

      .worker-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }

      .worker-card header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .worker-card h3 {
        margin: 0;
        font-size: 1.05rem;
      }

      .worker-meta {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
        color: #52606d;
        font-size: 0.92rem;
      }

      .worker-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: #175cd3;
        color: #fff;
        padding: 10px 14px;
        font: inherit;
        cursor: pointer;
      }

      button.secondary {
        background: #344054;
      }

      button.warn {
        background: #b54708;
      }

      button.success {
        background: #027a48;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.6;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 10px;
      }

      li {
        padding: 12px 14px;
        border-radius: 14px;
        background: #f7fafc;
        border: 1px solid rgba(82, 96, 109, 0.12);
      }

      .event-meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 6px;
        font-size: 0.88rem;
        color: #52606d;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.82rem;
        background: #e4ecf7;
      }

      .badge.warn {
        background: #fff2d6;
      }

      .badge.error {
        background: #fde8e8;
      }

      .empty,
      .error {
        color: #52606d;
      }

      .error {
        color: #b42318;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Operator Admin</h1>
        <p>
          Internal-only observability and browser access controls for the managed
          ChatGPT worker pool. Start pool now uses compact visible fallback by
          default, keeping small worker windows alive in the screen corner.
          Alternate desktop remains available only as an explicit non-visible probe.
        </p>
        <div class="status-bar" id="status-bar">Loading latest operator snapshot...</div>
      </header>

      <div class="grid">
        <section>
          <h2>Host pool lifecycle</h2>
          <div class="pool-panel">
            <div class="pool-row">
              <div>
                <div class="badge" id="host-pool-status-badge">idle</div>
                <p id="host-pool-status-copy">Checking host-pool lifecycle...</p>
              </div>
              <div class="worker-actions">
                <button id="host-pool-start" data-pool-action="start">Start pool</button>
                <button id="host-pool-start-alternate" class="secondary" data-pool-action="start-alternate">Start alternate desktop pool</button>
                <button id="host-pool-stop" class="secondary" data-pool-action="stop">Stop pool</button>
              </div>
            </div>
            <div class="pool-meta" id="host-pool-meta"></div>
          </div>
        </section>

        <section>
          <h2>Latest rollout smoke</h2>
          <div class="pool-panel">
            <p class="empty" id="rollout-smoke-copy">Loading latest rollout smoke...</p>
            <div class="counts" id="rollout-smoke-summary"></div>
            <ul id="rollout-smoke-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest readiness recovery</h2>
          <div class="pool-panel">
            <p class="empty" id="readiness-recovery-copy">Loading latest readiness recovery...</p>
            <div class="counts" id="readiness-recovery-summary"></div>
            <ul id="readiness-recovery-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-recovery smoke regression</h2>
          <div class="pool-panel">
            <p class="empty" id="post-recovery-regression-copy">Loading latest post-recovery smoke regression...</p>
            <div class="counts" id="post-recovery-regression-summary"></div>
            <ul id="post-recovery-regression-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest zero-ready root cause</h2>
          <div class="pool-panel">
            <p class="empty" id="zero-ready-root-cause-copy">Loading latest zero-ready root cause...</p>
            <div class="counts" id="zero-ready-root-cause-summary"></div>
            <ul id="zero-ready-root-cause-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest disconnected baseline remediation</h2>
          <div class="pool-panel">
            <p class="empty" id="disconnected-baseline-remediation-copy">Loading latest disconnected baseline remediation...</p>
            <div class="counts" id="disconnected-baseline-remediation-summary"></div>
            <ul id="disconnected-baseline-remediation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-remediation degraded smoke stabilization</h2>
          <div class="pool-panel">
            <p class="empty" id="post-remediation-degraded-smoke-copy">Loading latest post-remediation degraded smoke stabilization...</p>
            <div class="counts" id="post-remediation-degraded-smoke-summary"></div>
            <ul id="post-remediation-degraded-smoke-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-stabilization runtime investigation</h2>
          <div class="pool-panel">
            <p class="empty" id="post-stabilization-runtime-investigation-copy">Loading latest post-stabilization runtime investigation...</p>
            <div class="counts" id="post-stabilization-runtime-investigation-summary"></div>
            <ul id="post-stabilization-runtime-investigation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest disconnected runtime remediation</h2>
          <div class="pool-panel">
            <p class="empty" id="disconnected-runtime-remediation-copy">Loading latest disconnected runtime remediation...</p>
            <div class="counts" id="disconnected-runtime-remediation-summary"></div>
            <ul id="disconnected-runtime-remediation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest persistent disconnected runtime follow-up</h2>
          <div class="pool-panel">
            <p class="empty" id="persistent-disconnected-runtime-followup-copy">Loading latest persistent disconnected runtime follow-up...</p>
            <div class="counts" id="persistent-disconnected-runtime-followup-summary"></div>
            <ul id="persistent-disconnected-runtime-followup-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest runtime parity backport remediation</h2>
          <div class="pool-panel">
            <p class="empty" id="runtime-parity-backport-remediation-copy">Loading latest runtime parity backport remediation...</p>
            <div class="counts" id="runtime-parity-backport-remediation-summary"></div>
            <ul id="runtime-parity-backport-remediation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-parity disconnected runtime remediation</h2>
          <div class="pool-panel">
            <p class="empty" id="post-parity-disconnected-runtime-remediation-copy">Loading latest post-parity disconnected runtime remediation...</p>
            <div class="counts" id="post-parity-disconnected-runtime-remediation-summary"></div>
            <ul id="post-parity-disconnected-runtime-remediation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase21 disconnected runtime follow-up</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase21-disconnected-runtime-followup-copy">Loading latest post-phase21 disconnected runtime follow-up...</p>
            <div class="counts" id="post-phase21-disconnected-runtime-followup-summary"></div>
            <ul id="post-phase21-disconnected-runtime-followup-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase22 smoke-wrapper parity remediation</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase22-smoke-wrapper-parity-remediation-copy">Loading latest post-phase22 smoke-wrapper parity remediation...</p>
            <div class="counts" id="post-phase22-smoke-wrapper-parity-remediation-summary"></div>
            <ul id="post-phase22-smoke-wrapper-parity-remediation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase23 exact smoke-wrapper compat remediation</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase23-exact-smoke-wrapper-compat-remediation-copy">Loading latest post-phase23 exact smoke-wrapper compat remediation...</p>
            <div class="counts" id="post-phase23-exact-smoke-wrapper-compat-remediation-summary"></div>
            <ul id="post-phase23-exact-smoke-wrapper-compat-remediation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase24 external API readiness</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase24-external-api-readiness-copy">Loading latest post-phase24 external API readiness...</p>
            <div class="counts" id="post-phase24-external-api-readiness-summary"></div>
            <ul id="post-phase24-external-api-readiness-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase25 external restoration</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase25-external-restoration-copy">Loading latest post-phase25 external restoration...</p>
            <div class="counts" id="post-phase25-external-restoration-summary"></div>
            <ul id="post-phase25-external-restoration-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase26 Ubuntu SSH recovery</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase26-ubuntu-ssh-recovery-copy">Loading latest post-phase26 Ubuntu SSH recovery...</p>
            <div class="counts" id="post-phase26-ubuntu-ssh-recovery-summary"></div>
            <ul id="post-phase26-ubuntu-ssh-recovery-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase27 local proxy/bootstrap stabilization</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase27-local-proxy-bootstrap-copy">Loading latest post-phase27 local proxy/bootstrap stabilization...</p>
            <div class="counts" id="post-phase27-local-proxy-bootstrap-summary"></div>
            <ul id="post-phase27-local-proxy-bootstrap-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase28 local proxy transport repair</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase28-local-proxy-transport-copy">Loading latest post-phase28 local proxy transport repair...</p>
            <div class="counts" id="post-phase28-local-proxy-transport-summary"></div>
            <ul id="post-phase28-local-proxy-transport-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase29 shared-2 chat 409</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase29-shared-2-chat-409-copy">Loading latest post-phase29 shared-2 chat 409...</p>
            <div class="counts" id="post-phase29-shared-2-chat-409-summary"></div>
            <ul id="post-phase29-shared-2-chat-409-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase30 shared-2 bootstrap recovery</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase30-shared-2-bootstrap-recovery-copy">Loading latest post-phase30 shared-2 bootstrap recovery...</p>
            <div class="counts" id="post-phase30-shared-2-bootstrap-recovery-summary"></div>
            <ul id="post-phase30-shared-2-bootstrap-recovery-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase31 local account surface inventory</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase31-account-surface-inventory-copy">Loading latest post-phase31 local account surface inventory...</p>
            <div class="counts" id="post-phase31-account-surface-inventory-summary"></div>
            <ul id="post-phase31-account-surface-inventory-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase31 selected canary chat recovery</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase31-selected-canary-chat-recovery-copy">Loading latest post-phase31 selected canary chat recovery...</p>
            <div class="counts" id="post-phase31-selected-canary-chat-recovery-summary"></div>
            <ul id="post-phase31-selected-canary-chat-recovery-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase32 rotating ready-account chat proof</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase32-rotating-ready-account-chat-proof-copy">Loading latest post-phase32 rotating ready-account chat proof...</p>
            <div class="counts" id="post-phase32-rotating-ready-account-chat-proof-summary"></div>
            <ul id="post-phase32-rotating-ready-account-chat-proof-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase33 account browser isolation</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase33-account-browser-isolation-copy">Loading latest post-phase33 account browser isolation...</p>
            <div class="counts" id="post-phase33-account-browser-isolation-summary"></div>
            <ul id="post-phase33-account-browser-isolation-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase33 isolated external chat proof</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase33-isolated-external-chat-proof-copy">Loading latest post-phase33 isolated external chat proof...</p>
            <div class="counts" id="post-phase33-isolated-external-chat-proof-summary"></div>
            <ul id="post-phase33-isolated-external-chat-proof-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase34 server isolated external chat proof</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase34-server-isolated-chat-transfer-copy">Loading latest post-phase34 server isolated external chat proof...</p>
            <div class="counts" id="post-phase34-server-isolated-chat-transfer-summary"></div>
            <ul id="post-phase34-server-isolated-chat-transfer-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase35 server token SSH listener recovery</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase35-server-token-ssh-listener-recovery-copy">Loading latest post-phase35 server token SSH listener recovery...</p>
            <div class="counts" id="post-phase35-server-token-ssh-listener-recovery-summary"></div>
            <ul id="post-phase35-server-token-ssh-listener-recovery-details"></ul>
          </div>
        </section>

        <section>
          <h2>Latest post-phase36 reverse tunnel chat smoke</h2>
          <div class="pool-panel">
            <p class="empty" id="post-phase36-reverse-tunnel-chat-smoke-copy">Loading latest post-phase36 reverse tunnel chat smoke...</p>
            <div class="counts" id="post-phase36-reverse-tunnel-chat-smoke-summary"></div>
            <ul id="post-phase36-reverse-tunnel-chat-smoke-details"></ul>
          </div>
        </section>

        <section>
          <h2>Worker status summary</h2>
          <div class="counts" id="worker-summary"></div>
          <div class="worker-cards" id="worker-cards"></div>
        </section>

        <section>
          <h2>Recent failures</h2>
          <ul id="recent-failures"></ul>
        </section>

        <section>
          <h2>Recent lifecycle events</h2>
          <ul id="recent-events"></ul>
        </section>
      </div>
    </main>

    <script>
      const lifecycleEventTypes = new Set([
        "worker_status_changed",
        "worker_restart_requested",
        "worker_reauth_started",
        "worker_reauth_completed"
      ]);
      const activeBrowserAccessStatuses = new Set([
        "requested",
        "browser_ready",
        "waiting_for_operator"
      ]);
      const browserAccessByWorker = new Map();
      let pendingAction = null;
      let pendingPoolAction = null;
      let currentHostPool = null;

      function severityClass(severity) {
        return severity === "warn" || severity === "error" ? severity : "";
      }

      function poolStatusSeverity(status) {
        if (status === "failed") {
          return "error";
        }

        if (status === "degraded" || status === "starting" || status === "stopping") {
          return "warn";
        }

        return "";
      }

      function describeHostPoolStatus(status) {
        if (status === "idle") {
          return "Pool is stopped. Start pool now uses compact visible runtime by default, while alternate desktop is only an explicit probe path.";
        }

        if (status === "starting") {
          return "Pool start is in progress. Waiting for proxy and workers to come online.";
        }

        if (status === "ready") {
          return "Pool is ready. Proxy is listening and the configured workers are reachable on the compact visible baseline or another explicit runtime.";
        }

        if (status === "degraded") {
          return "Pool is degraded. Partial success is visible here and this phase does not auto-rollback or auto-retry.";
        }

        if (status === "stopping") {
          return "Pool stop is in progress. Waiting for workers and proxy to shut down cleanly.";
        }

        return "Pool action failed. Check the last error and recent events before trying again.";
      }

      function formatWhen(value) {
        if (!value) {
          return "no events yet";
        }

        return new Date(value).toLocaleString();
      }

      function statusLabel(result, successLabel = "pass", failureLabel = "fail") {
        if (!result) {
          return "unknown";
        }

        return result.ok ? successLabel : failureLabel;
      }

      function statusDetail(result, successLabel = "ok") {
        if (!result) {
          return "unknown";
        }

        if (result.ok) {
          return successLabel + " (" + (result.statusCode ?? "n/a") + ")";
        }

        return "failed (" + (result.errorKind || result.statusCode || "unknown") + ")";
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function runtimeModeLabel(worker) {
        if (worker.runtimeClass === "host_visible_compact") {
          return "Compact visible";
        }

        if (worker.runtimeMode === "visible_auth") {
          return "Visible auth";
        }

        if (worker.runtimeMode === "alternate_desktop") {
          return "Alternate desktop";
        }

        if (worker.runtimeMode === "hidden_runtime") {
          return "Hidden runtime";
        }

        return "Unknown runtime";
      }

      function repeatabilityLabel(worker) {
        const gateStatus = worker.stabilityGateStatus || "unstable";
        const passCount = worker.stabilityPassCount ?? 0;
        const targetPasses = worker.stabilityTargetPasses ?? 2;

        return "Repeatability: " + gateStatus + " (" + passCount + "/" + targetPasses + ")";
      }

      async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
          headers: {
            "content-type": "application/json"
          },
          ...options
        });
        const rawBody = await response.text();
        const body = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(body?.detail || body?.error || "Request failed");
        }

        return body;
      }

      async function loadBrowserAccess(workerId) {
        const response = await fetch("/internal/workers/" + workerId + "/browser-access");

        if (response.status === 404) {
          return null;
        }

        const rawBody = await response.text();
        const body = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(body?.detail || body?.error || "Browser access unavailable");
        }

        return body?.browserAccess ?? null;
      }

      function renderWorkerSummary(summary, workers) {
        const container = document.getElementById("worker-summary");
        const statusKeys = Object.keys(summary.workerStatusCounts).sort();

        const cards = [
          ["Total workers", String(summary.totalWorkers)],
          ["Info events", String(summary.severityCounts.info)],
          ["Warn events", String(summary.severityCounts.warn)],
          ["Error events", String(summary.severityCounts.error)],
          ...statusKeys.map((key) => [key, String(summary.workerStatusCounts[key])])
        ];

        container.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");

        const workerCards = document.getElementById("worker-cards");
        workerCards.innerHTML = workers.map((worker) => {
          const browserAccess = browserAccessByWorker.get(worker.workerId);
          const hasActiveBrowserAccess =
            browserAccess && activeBrowserAccessStatuses.has(browserAccess.status);
          const browserAccessLabel = browserAccess
            ? browserAccess.status + " until " + formatWhen(browserAccess.expiresAt)
            : "none";
          const busyForWorker = pendingAction === worker.workerId;
          const hiddenRuntimeAuthLost =
            worker.runtimeType === "host" &&
            worker.runtimeMode === "alternate_desktop" &&
            worker.status.status === "reauth_required";
          const bootstrapStatusCopy =
            worker.lastBootstrapFailureCode === "bootstrap_auth_required"
              ? "Bootstrap says auth is required in the non-visible runtime."
              : worker.lastBootstrapFailureCode
                ? "Bootstrap drift is present in the non-visible runtime."
                : worker.lastBootstrapStep
                  ? "Bootstrap has recent step evidence for this worker."
                  : "No recent bootstrap diagnostics yet.";
          const runtimeMode = runtimeModeLabel(worker);
          const runtimeFacts = [
            "Runtime mode: " + runtimeMode,
            "Headless: " + (worker.headless === null || worker.headless === undefined ? "unknown" : worker.headless ? "yes" : "no"),
            "CDP attached: " + (worker.cdpAttached === null || worker.cdpAttached === undefined ? "unknown" : worker.cdpAttached ? "yes" : "no"),
            "Proxy configured: " + (worker.proxyServerConfigured === null || worker.proxyServerConfigured === undefined ? "unknown" : worker.proxyServerConfigured ? "yes" : "no")
          ];
          const bootstrapFacts = [
            "Last bootstrap step: " + (worker.lastBootstrapStep || "n/a"),
            "Last bootstrap failure: " + (worker.lastBootstrapFailureCode || "none"),
            "Last bootstrap usability: " + (worker.lastBootstrapUsability || "n/a")
          ];
          const repeatabilityFacts = [
            repeatabilityLabel(worker),
            "Last validation: " + (worker.lastValidationAt || "n/a"),
            "Last validation result: " + (worker.lastValidationResult || "n/a")
          ];
          const diagnosticProfileActive =
            typeof worker.lastValidationResult === "string" &&
            worker.lastValidationResult.includes("diagnostic_profile");
          const profileStrategyCopy = diagnosticProfileActive
            ? "Profile strategy: diagnostic temporary profile"
            : "Profile strategy: durable profile";

          return \`
            <article class="worker-card">
              <header>
                <div>
                  <h3>\${escapeHtml(worker.displayName)}</h3>
                  <div class="badge">\${escapeHtml(worker.workerId)}</div>
                </div>
                <div class="badge \${severityClass(worker.status.status === "reauth_required" ? "warn" : worker.status.status === "disconnected" ? "error" : "info")}">
                  \${escapeHtml(worker.status.status)}
                </div>
              </header>
              <div class="worker-meta">
                <span>Runtime: \${escapeHtml(worker.runtimeType)}</span>
                <span>\${escapeHtml(worker.runtimeType === "host" ? "Host worker: " + worker.containerName : "Container: " + worker.containerName)}</span>
                <span>Worker state: \${escapeHtml(worker.runtimeStatus || worker.status.status)}</span>
                \${runtimeFacts.map((fact) => \`<span>\${escapeHtml(fact)}</span>\`).join("")}
                \${bootstrapFacts.map((fact) => \`<span>\${escapeHtml(fact)}</span>\`).join("")}
                \${worker.runtimeType === "docker" ? \`<span>Browser access: \${escapeHtml(browserAccessLabel)}</span>\` : \`<span>Compact visible is the routine fallback; full visible auth runs only when explicitly requested.</span>\`}
                <span>Last seen: \${escapeHtml(worker.lastSeenAt || "n/a")}</span>
                <span>\${escapeHtml(bootstrapStatusCopy)}</span>
                \${repeatabilityFacts.map((fact) => \`<span>\${escapeHtml(fact)}</span>\`).join("")}
                <span>\${escapeHtml(profileStrategyCopy)}</span>
                \${diagnosticProfileActive ? \`<span>Temporary profile does not delete the durable profile.</span>\` : ""}
                \${hiddenRuntimeAuthLost ? \`<span class="error">Non-visible runtime lost auth after manual login; architecture review required.</span>\` : ""}
              </div>
              <div class="worker-actions">
                \${worker.runtimeType === "docker" ? \`<button data-action="open-browser" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Open browser</button>\` : \`<button data-action="manual-auth-start" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Start visible login</button>\`}
                \${worker.runtimeType === "docker" ? \`<button class="secondary" data-action="start-reauth" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Start reauth</button>\` : \`<button class="secondary" data-action="manual-reauth-start" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Start visible reauth</button>\`}
                \${worker.runtimeType === "host" ? \`<button class="warn" data-action="diagnostic-profile-start" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Start fresh-profile diagnostic</button>\` : ""}
                <button class="secondary" data-action="mark-ready" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Mark ready</button>
                \${worker.runtimeType === "docker" && hasActiveBrowserAccess ? \`<button class="warn" data-action="cancel-access" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Cancel access</button>\` : ""}
                \${worker.runtimeType === "docker" && hasActiveBrowserAccess ? \`<button class="success" data-action="complete-access" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Complete login/reauth</button>\` : ""}
                \${worker.runtimeType === "host" ? \`<button class="success" data-action="manual-auth-complete-and-validate" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Complete login and validate</button>\` : ""}
                \${worker.runtimeType === "host" ? \`<button class="secondary" data-action="manual-auth-complete-compact-visible" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Use compact visible runtime</button>\` : ""}
                \${worker.runtimeType === "host" ? \`<button class="secondary" data-action="validate-runtime" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Validate non-visible runtime</button>\` : ""}
              </div>
            </article>
          \`;
        }).join("");
      }

      function renderRolloutSmoke(latest) {
        const copy = document.getElementById("rollout-smoke-copy");
        const summary = document.getElementById("rollout-smoke-summary");
        const details = document.getElementById("rollout-smoke-details");

        if (!latest) {
          copy.textContent = "No rollout smoke captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const totalWorkers = latest.internal?.workers?.totalWorkers ?? 0;
        const readyWorkers = latest.internal?.workers?.readyWorkers ?? 0;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Canary worker", String(latest.canaryWorkerId || "n/a")],
          ["Pool status", String(latest.internal?.pool?.status || "unknown")],
          ["Ready workers", totalWorkers > 0 ? readyWorkers + "/" + totalWorkers : String(readyWorkers)],
          ["Public healthz", statusLabel(latest.publicCanary?.healthz)],
          ["Public chat", statusLabel(latest.publicCanary?.chat)]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Public base URL: " + (latest.publicBaseUrl || "n/a"),
          "Public v1/models: " + statusDetail(latest.publicCanary?.models),
          "Public v1/chat/completions: " + statusDetail(latest.publicCanary?.chat, latest.publicCanary?.chat?.assistantReplyText || "ok"),
          "Recent operator failures: " + String(latest.internal?.observability?.recentFailureCount ?? 0)
        ];

        copy.textContent =
          latest.summary ||
          "Latest rollout smoke loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderReadinessRecovery(latest) {
        const copy = document.getElementById("readiness-recovery-copy");
        const summary = document.getElementById("readiness-recovery-summary");
        const details = document.getElementById("readiness-recovery-details");

        if (!latest) {
          copy.textContent = "No readiness recovery captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const totalWorkers = latest.counts?.totalWorkers ?? latest.after?.internal?.workers?.totalWorkers ?? 0;
        const readyWorkers = latest.counts?.readyWorkers ?? latest.after?.internal?.workers?.readyWorkers ?? 0;
        const reauthRequiredWorkers = latest.counts?.reauthRequiredWorkers ?? 0;
        const reachableButUnusableWorkers = latest.counts?.reachableButUnusableWorkers ?? 0;
        const disconnectedWorkers = latest.counts?.disconnectedWorkers ?? 0;
        const recoveredWorkerIds = latest.recoveredWorkerIds ?? [];
        const blockerSummaries = latest.blockerSummaries ?? [];
        const cards = [
          ["Requested workers", String(latest.requestedWorkerIds?.length ?? 0)],
          ["Ready workers", totalWorkers > 0 ? readyWorkers + "/" + totalWorkers : String(readyWorkers)],
          ["reauth_required", String(reauthRequiredWorkers)],
          ["reachable_but_unusable", String(reachableButUnusableWorkers)],
          ["disconnected", String(disconnectedWorkers)],
          ["Recovered workers", String(recoveredWorkerIds.length)]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "Recovered worker IDs: " + (recoveredWorkerIds.length ? recoveredWorkerIds.join(", ") : "none"),
          "Blockers: " + (blockerSummaries.length ? blockerSummaries.join(" | ") : "none"),
          "Inventory mismatch: " + (latest.inventory?.inventoryMismatch ? "yes" : "no"),
          "Public canary after recovery: " + statusLabel(latest.publicCanaryAfterRecovery?.chat)
        ];

        copy.textContent =
          latest.summary ||
          "Latest readiness recovery loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostRecoveryRegression(latest) {
        const copy = document.getElementById("post-recovery-regression-copy");
        const summary = document.getElementById("post-recovery-regression-summary");
        const details = document.getElementById("post-recovery-regression-details");

        if (!latest) {
          copy.textContent = "No post-recovery smoke regression captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const recoveredReadyCount =
          latest.recoveredReadyCount ??
          latest.stageCounts?.after_recovery?.readyWorkers ??
          0;
        const recoveredTotalWorkers =
          latest.stageCounts?.after_recovery?.totalWorkers ??
          latest.stageCounts?.after_settle?.totalWorkers ??
          0;
        const finalSmokeReadyCount =
          latest.finalSmokeReadyCount ??
          latest.stageCounts?.after_settle?.readyWorkers ??
          0;
        const finalSmokeTotalWorkers =
          latest.stageCounts?.after_settle?.totalWorkers ??
          recoveredTotalWorkers;
        const stageList = latest.stageOrder ?? [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")],
          ["Recovered ready", recoveredTotalWorkers > 0 ? recoveredReadyCount + "/" + recoveredTotalWorkers : String(recoveredReadyCount)],
          ["Final smoke ready", finalSmokeTotalWorkers > 0 ? finalSmokeReadyCount + "/" + finalSmokeTotalWorkers : String(finalSmokeReadyCount)],
          ["First regression stage", String(latest.firstRegressionStage || "none")],
          ["shared-6 canary", statusLabel(latest.smoke?.publicCanary?.chat)]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "Public base URL: " + (latest.publicBaseUrl || latest.smoke?.publicBaseUrl || "n/a"),
          "Stage list: " + (stageList.length ? stageList.join(", ") : "none"),
          "Smoke verdict: " + String(latest.smoke?.verdict || "unknown"),
          "shared-6 reply: " + String(latest.smoke?.publicCanary?.chat?.assistantReplyText || "n/a")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-recovery smoke regression loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderZeroReadyRootCause(latest) {
        const copy = document.getElementById("zero-ready-root-cause-copy");
        const summary = document.getElementById("zero-ready-root-cause-summary");
        const details = document.getElementById("zero-ready-root-cause-details");

        if (!latest) {
          copy.textContent = "No zero-ready root-cause result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const totalWorkers = latest.totalWorkers ?? 0;
        const readyCount = latest.readyCount ?? latest.classificationCounts?.ready ?? 0;
        const disconnectedCount =
          latest.disconnectedCount ?? latest.classificationCounts?.disconnected ?? 0;
        const hopList = latest.hopOrder ?? [];
        const publicOwnerHop = latest.hopResults?.ubuntu_public_owner ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Dominant blocker class", String(latest.dominantBlockerClass || "unknown")],
          ["Ready workers", totalWorkers > 0 ? readyCount + "/" + totalWorkers : String(readyCount)],
          ["Disconnected", String(disconnectedCount)],
          ["First failing hop", String(latest.firstFailingHop || "not proven")],
          ["shared-6 public hop", statusLabel(publicOwnerHop?.chat)]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "dominantBlockerClass: " + String(latest.dominantBlockerClass || "unknown"),
          "firstFailingHop: " + String(latest.firstFailingHop || "not proven"),
          "Hop list: " + (hopList.length ? hopList.join(", ") : "none"),
          "Public owner chat: " + statusDetail(publicOwnerHop?.chat, publicOwnerHop?.chat?.assistantReplyText || "ok")
        ];

        copy.textContent =
          latest.summary ||
          "Latest zero-ready root cause loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderDisconnectedBaselineRemediation(latest) {
        const copy = document.getElementById("disconnected-baseline-remediation-copy");
        const summary = document.getElementById("disconnected-baseline-remediation-summary");
        const details = document.getElementById("disconnected-baseline-remediation-details");

        if (!latest) {
          copy.textContent = "No disconnected baseline remediation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const recoveredReadyCount = latest.recoveredReadyCount ?? 0;
        const dominantRemainingBlockerClass =
          latest.dominantRemainingBlockerClass || "none";
        const forcedHostHopStatus = latest.forcedHostHopStatus ?? null;
        const publicOwnerHopStatus = latest.publicOwnerHopStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Recovered ready count", String(recoveredReadyCount)],
          ["Dominant remaining blocker class", String(dominantRemainingBlockerClass)],
          ["forced-Host hop", forcedHostHopStatus?.passed ? "pass" : "fail"],
          ["public-owner hop", publicOwnerHopStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "recoveredReadyCount: " + String(recoveredReadyCount),
          "dominantRemainingBlockerClass: " + String(dominantRemainingBlockerClass),
          "forced-Host hop: " + String(forcedHostHopStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostHopStatus?.chatStatusCode ?? "n/a"),
          "public-owner hop: " + String(publicOwnerHopStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerHopStatus?.chatStatusCode ?? "n/a")
        ];

        copy.textContent =
          latest.summary ||
          "Latest disconnected baseline remediation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostRemediationDegradedSmoke(latest) {
        const copy = document.getElementById("post-remediation-degraded-smoke-copy");
        const summary = document.getElementById("post-remediation-degraded-smoke-summary");
        const details = document.getElementById("post-remediation-degraded-smoke-details");

        if (!latest) {
          copy.textContent = "No post-remediation degraded smoke stabilization captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preSmokeReadyCount = latest.preSmokeReadyCount ?? 0;
        const preSmokeTotalWorkers = latest.preSmokeTotalWorkers ?? 0;
        const finalSmokeReadyCount = latest.finalSmokeReadyCount ?? 0;
        const finalSmokeTotalWorkers = latest.finalSmokeTotalWorkers ?? 0;
        const finalPoolStatus = latest.finalPoolStatus || "unknown";
        const publicCanaryPassed = latest.publicCanaryPassed === true;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-smoke ready", preSmokeTotalWorkers > 0 ? preSmokeReadyCount + "/" + preSmokeTotalWorkers : String(preSmokeReadyCount)],
          ["Final smoke ready", finalSmokeTotalWorkers > 0 ? finalSmokeReadyCount + "/" + finalSmokeTotalWorkers : String(finalSmokeReadyCount)],
          ["Final pool status", String(finalPoolStatus)],
          ["Public canary", publicCanaryPassed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preSmokeReadyCount: " + String(preSmokeReadyCount),
          "finalSmokeReadyCount: " + String(finalSmokeReadyCount),
          "finalPoolStatus: " + String(finalPoolStatus),
          "publicCanaryPassed: " + String(publicCanaryPassed)
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-remediation degraded smoke stabilization loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostStabilizationRuntimeInvestigation(latest) {
        const copy = document.getElementById("post-stabilization-runtime-investigation-copy");
        const summary = document.getElementById("post-stabilization-runtime-investigation-summary");
        const details = document.getElementById("post-stabilization-runtime-investigation-details");

        if (!latest) {
          copy.textContent = "No post-stabilization runtime investigation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preInvestigationReadyCount = latest.preInvestigationReadyCount ?? 0;
        const postCanaryReadyCount = latest.postCanaryReadyCount ?? 0;
        const finalReadyCount = latest.finalReadyCount ?? 0;
        const dominantRuntimeBlocker =
          latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-investigation ready", String(preInvestigationReadyCount)],
          ["Post-canary ready", String(postCanaryReadyCount)],
          ["Final ready", String(finalReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preInvestigationReadyCount: " + String(preInvestigationReadyCount),
          "postCanaryReadyCount: " + String(postCanaryReadyCount),
          "finalReadyCount: " + String(finalReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop)
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-stabilization runtime investigation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderDisconnectedRuntimeRemediation(latest) {
        const copy = document.getElementById("disconnected-runtime-remediation-copy");
        const summary = document.getElementById("disconnected-runtime-remediation-summary");
        const details = document.getElementById("disconnected-runtime-remediation-details");

        if (!latest) {
          copy.textContent = "No disconnected runtime remediation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preRemediationReadyCount = latest.preRemediationReadyCount ?? 0;
        const preRemediationTotalWorkers = latest.preRemediationTotalWorkers ?? 0;
        const postRemediationReadyCount = latest.postRemediationReadyCount ?? 0;
        const postRemediationTotalWorkers = latest.postRemediationTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-remediation ready", preRemediationTotalWorkers > 0 ? preRemediationReadyCount + "/" + preRemediationTotalWorkers : String(preRemediationReadyCount)],
          ["Post-remediation ready", postRemediationTotalWorkers > 0 ? postRemediationReadyCount + "/" + postRemediationTotalWorkers : String(postRemediationReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["forced-Host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preRemediationReadyCount: " + String(preRemediationReadyCount),
          "postRemediationReadyCount: " + String(postRemediationReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest disconnected runtime remediation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPersistentDisconnectedRuntimeFollowup(latest) {
        const copy = document.getElementById("persistent-disconnected-runtime-followup-copy");
        const summary = document.getElementById("persistent-disconnected-runtime-followup-summary");
        const details = document.getElementById("persistent-disconnected-runtime-followup-details");

        if (!latest) {
          copy.textContent = "No persistent disconnected runtime follow-up captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preFollowupReadyCount = latest.preFollowupReadyCount ?? 0;
        const preFollowupTotalWorkers = latest.preFollowupTotalWorkers ?? 0;
        const postFollowupReadyCount = latest.postFollowupReadyCount ?? 0;
        const postFollowupTotalWorkers = latest.postFollowupTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-follow-up ready", preFollowupTotalWorkers > 0 ? preFollowupReadyCount + "/" + preFollowupTotalWorkers : String(preFollowupReadyCount)],
          ["Post-follow-up ready", postFollowupTotalWorkers > 0 ? postFollowupReadyCount + "/" + postFollowupTotalWorkers : String(postFollowupReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["forced-Host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preFollowupReadyCount: " + String(preFollowupReadyCount),
          "postFollowupReadyCount: " + String(postFollowupReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest persistent disconnected runtime follow-up loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderRuntimeParityBackportRemediation(latest) {
        const copy = document.getElementById("runtime-parity-backport-remediation-copy");
        const summary = document.getElementById("runtime-parity-backport-remediation-summary");
        const details = document.getElementById("runtime-parity-backport-remediation-details");

        if (!latest) {
          copy.textContent = "No runtime parity backport remediation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preRemediationReadyCount = latest.preRemediationReadyCount ?? 0;
        const preRemediationTotalWorkers = latest.preRemediationTotalWorkers ?? 0;
        const postRemediationReadyCount = latest.postRemediationReadyCount ?? 0;
        const postRemediationTotalWorkers = latest.postRemediationTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const parityBackportFiles = Array.isArray(latest.parityBackportFiles)
          ? latest.parityBackportFiles
          : [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-remediation ready", preRemediationTotalWorkers > 0 ? preRemediationReadyCount + "/" + preRemediationTotalWorkers : String(preRemediationReadyCount)],
          ["Post-remediation ready", postRemediationTotalWorkers > 0 ? postRemediationReadyCount + "/" + postRemediationTotalWorkers : String(postRemediationReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["forced-host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Parity backport files", String(parityBackportFiles.length)],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preRemediationReadyCount: " + String(preRemediationReadyCount),
          "postRemediationReadyCount: " + String(postRemediationReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "parityBackportFiles: " + (parityBackportFiles.length > 0 ? parityBackportFiles.join(", ") : "none"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest runtime parity backport remediation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostParityDisconnectedRuntimeRemediation(latest) {
        const copy = document.getElementById("post-parity-disconnected-runtime-remediation-copy");
        const summary = document.getElementById("post-parity-disconnected-runtime-remediation-summary");
        const details = document.getElementById("post-parity-disconnected-runtime-remediation-details");

        if (!latest) {
          copy.textContent = "No post-parity disconnected runtime remediation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preRemediationReadyCount = latest.preRemediationReadyCount ?? 0;
        const preRemediationTotalWorkers = latest.preRemediationTotalWorkers ?? 0;
        const postRemediationReadyCount = latest.postRemediationReadyCount ?? 0;
        const postRemediationTotalWorkers = latest.postRemediationTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-remediation ready", preRemediationTotalWorkers > 0 ? preRemediationReadyCount + "/" + preRemediationTotalWorkers : String(preRemediationReadyCount)],
          ["Post-remediation ready", postRemediationTotalWorkers > 0 ? postRemediationReadyCount + "/" + postRemediationTotalWorkers : String(postRemediationReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["forced-host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preRemediationReadyCount: " + String(preRemediationReadyCount),
          "postRemediationReadyCount: " + String(postRemediationReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-parity disconnected runtime remediation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase21DisconnectedRuntimeFollowup(latest) {
        const copy = document.getElementById("post-phase21-disconnected-runtime-followup-copy");
        const summary = document.getElementById("post-phase21-disconnected-runtime-followup-summary");
        const details = document.getElementById("post-phase21-disconnected-runtime-followup-details");

        if (!latest) {
          copy.textContent = "No post-phase21 disconnected runtime follow-up captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preRemediationReadyCount = latest.preRemediationReadyCount ?? 0;
        const preRemediationTotalWorkers = latest.preRemediationTotalWorkers ?? 0;
        const postRemediationReadyCount = latest.postRemediationReadyCount ?? 0;
        const postRemediationTotalWorkers = latest.postRemediationTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const loopbackStatus = latest.loopbackStatus ?? null;
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Pre-remediation ready", preRemediationTotalWorkers > 0 ? preRemediationReadyCount + "/" + preRemediationTotalWorkers : String(preRemediationReadyCount)],
          ["Post-remediation ready", postRemediationTotalWorkers > 0 ? postRemediationReadyCount + "/" + postRemediationTotalWorkers : String(postRemediationReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["loopback status", loopbackStatus?.passed ? "pass" : "fail"],
          ["forced-host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "preRemediationReadyCount: " + String(preRemediationReadyCount),
          "postRemediationReadyCount: " + String(postRemediationReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "loopbackStatus: " + String(loopbackStatus?.passed ? "pass" : "fail") + " chat=" + String(loopbackStatus?.chatStatusCode ?? "n/a"),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase21 disconnected runtime follow-up loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase22SmokeWrapperParityRemediation(latest) {
        const copy = document.getElementById("post-phase22-smoke-wrapper-parity-remediation-copy");
        const summary = document.getElementById("post-phase22-smoke-wrapper-parity-remediation-summary");
        const details = document.getElementById("post-phase22-smoke-wrapper-parity-remediation-details");

        if (!latest) {
          copy.textContent = "No post-phase22 smoke-wrapper parity remediation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preRemediationReadyCount = latest.preRemediationReadyCount ?? 0;
        const preRemediationTotalWorkers = latest.preRemediationTotalWorkers ?? 0;
        const postRemediationReadyCount = latest.postRemediationReadyCount ?? 0;
        const postRemediationTotalWorkers = latest.postRemediationTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const smokeWrapperParityStatus = latest.smokeWrapperParityStatus || "unknown";
        const loopbackStatus = latest.loopbackStatus ?? null;
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Smoke-wrapper parity status", String(smokeWrapperParityStatus)],
          ["Pre-remediation ready", preRemediationTotalWorkers > 0 ? preRemediationReadyCount + "/" + preRemediationTotalWorkers : String(preRemediationReadyCount)],
          ["Post-remediation ready", postRemediationTotalWorkers > 0 ? postRemediationReadyCount + "/" + postRemediationTotalWorkers : String(postRemediationReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["loopback status", loopbackStatus?.passed ? "pass" : "fail"],
          ["forced-host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "smokeWrapperParityStatus: " + String(smokeWrapperParityStatus),
          "preRemediationReadyCount: " + String(preRemediationReadyCount),
          "postRemediationReadyCount: " + String(postRemediationReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "loopbackStatus: " + String(loopbackStatus?.passed ? "pass" : "fail") + " chat=" + String(loopbackStatus?.chatStatusCode ?? "n/a"),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase22 smoke-wrapper parity remediation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase23ExactSmokeWrapperCompatRemediation(latest) {
        const copy = document.getElementById("post-phase23-exact-smoke-wrapper-compat-remediation-copy");
        const summary = document.getElementById("post-phase23-exact-smoke-wrapper-compat-remediation-summary");
        const details = document.getElementById("post-phase23-exact-smoke-wrapper-compat-remediation-details");

        if (!latest) {
          copy.textContent = "No post-phase23 exact smoke-wrapper compat remediation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const preRemediationReadyCount = latest.preRemediationReadyCount ?? 0;
        const preRemediationTotalWorkers = latest.preRemediationTotalWorkers ?? 0;
        const postRemediationReadyCount = latest.postRemediationReadyCount ?? 0;
        const postRemediationTotalWorkers = latest.postRemediationTotalWorkers ?? 0;
        const dominantRuntimeBlocker = latest.dominantRuntimeBlocker || "unknown";
        const firstFailingHop = latest.firstFailingHop || "not proven";
        const smokeWrapperCompatStatus = latest.smokeWrapperCompatStatus || "unknown";
        const loopbackStatus = latest.loopbackStatus ?? null;
        const forcedHostStatus = latest.forcedHostStatus ?? null;
        const publicOwnerStatus = latest.publicOwnerStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Smoke-wrapper compat status", String(smokeWrapperCompatStatus)],
          ["Pre-remediation ready", preRemediationTotalWorkers > 0 ? preRemediationReadyCount + "/" + preRemediationTotalWorkers : String(preRemediationReadyCount)],
          ["Post-remediation ready", postRemediationTotalWorkers > 0 ? postRemediationReadyCount + "/" + postRemediationTotalWorkers : String(postRemediationReadyCount)],
          ["Dominant runtime blocker", String(dominantRuntimeBlocker)],
          ["First failing hop", String(firstFailingHop)],
          ["loopback status", loopbackStatus?.passed ? "pass" : "fail"],
          ["forced-host status", forcedHostStatus?.passed ? "pass" : "fail"],
          ["public-owner status", publicOwnerStatus?.passed ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "Canary worker: " + (latest.canaryWorkerId || "n/a"),
          "smokeWrapperCompatStatus: " + String(smokeWrapperCompatStatus),
          "preRemediationReadyCount: " + String(preRemediationReadyCount),
          "postRemediationReadyCount: " + String(postRemediationReadyCount),
          "dominantRuntimeBlocker: " + String(dominantRuntimeBlocker),
          "firstFailingHop: " + String(firstFailingHop),
          "loopbackStatus: " + String(loopbackStatus?.passed ? "pass" : "fail") + " chat=" + String(loopbackStatus?.chatStatusCode ?? "n/a"),
          "forcedHostStatus: " + String(forcedHostStatus?.passed ? "pass" : "fail") + " chat=" + String(forcedHostStatus?.chatStatusCode ?? "n/a"),
          "publicOwnerStatus: " + String(publicOwnerStatus?.passed ? "pass" : "fail") + " chat=" + String(publicOwnerStatus?.chatStatusCode ?? "n/a"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase23 exact smoke-wrapper compat remediation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase24ExternalApiReadiness(latest) {
        const copy = document.getElementById("post-phase24-external-api-readiness-copy");
        const summary = document.getElementById("post-phase24-external-api-readiness-summary");
        const details = document.getElementById("post-phase24-external-api-readiness-details");

        if (!latest) {
          copy.textContent = "No post-phase24 external API readiness result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const reverseTunnelTaskStatus = latest.reverseTunnelTaskStatus ?? null;
        const ubuntuTunnelListenerStatus = latest.ubuntuTunnelListenerStatus ?? null;
        const canonicalPublicUpstreamStatus = latest.canonicalPublicUpstreamStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Canonical upstream", String(latest.canonicalPublicUpstream || "unknown")],
          ["reverse-tunnel task", String(reverseTunnelTaskStatus?.state || "unknown")],
          ["tunnel listener", ubuntuTunnelListenerStatus?.allRequiredPresent ? "ready" : "failed"],
          ["ready worker count", String(latest.readyWorkerCount ?? "0")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "canonicalPublicUpstream: " + String(latest.canonicalPublicUpstream || "unknown"),
          "reverseTunnelTaskStatus: " + String(reverseTunnelTaskStatus?.state || "unknown"),
          "reverse-tunnel task exists: " + String(reverseTunnelTaskStatus?.exists ?? false),
          "ubuntuTunnelListenerStatus: " + (ubuntuTunnelListenerStatus?.allRequiredPresent ? "ready" : "failed"),
          "tunnel listener present ports: " + String((ubuntuTunnelListenerStatus?.presentPorts || []).join(", ") || "none"),
          "tunnel listener missing ports: " + String((ubuntuTunnelListenerStatus?.missingPorts || []).join(", ") || "none"),
          "canonical upstream matches expected: " + String(canonicalPublicUpstreamStatus?.matchesExpected ?? false),
          "windowsCaddyPresent: " + String(latest.windowsCaddyPresent ?? "unknown"),
          "readyWorkerCount: " + String(latest.readyWorkerCount ?? "0"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase24 external API readiness loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase25ExternalRestoration(latest) {
        const copy = document.getElementById("post-phase25-external-restoration-copy");
        const summary = document.getElementById("post-phase25-external-restoration-summary");
        const details = document.getElementById("post-phase25-external-restoration-details");

        if (!latest) {
          copy.textContent = "No post-phase25 external restoration result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const reverseTunnelTaskStatus = latest.reverseTunnelTaskStatus ?? null;
        const ubuntuTunnelListenerStatus = latest.ubuntuTunnelListenerStatus ?? null;
        const canonicalPublicUpstreamStatus = latest.canonicalPublicUpstreamStatus ?? null;
        const externalHealthStatus = latest.externalHealthStatus ?? null;
        const externalModelsStatus = latest.externalModelsStatus ?? null;
        const externalChatStatus = latest.externalChatStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Ubuntu SSH", latest.ubuntuSshReachable ? "reachable" : "failed"],
          ["Canonical upstream", String(latest.canonicalPublicUpstream || "unknown")],
          ["reverse-tunnel task", String(reverseTunnelTaskStatus?.state || "unknown")],
          ["tunnel listener", ubuntuTunnelListenerStatus?.allRequiredPresent ? "ready" : "failed"],
          ["ready worker count", String(latest.readyWorkerCount ?? "0")],
          ["external chat", externalChatStatus?.ok ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "ubuntuSshReachable: " + String(latest.ubuntuSshReachable ?? false),
          "canonicalPublicUpstream: " + String(latest.canonicalPublicUpstream || "unknown"),
          "canonical upstream matches expected: " + String(canonicalPublicUpstreamStatus?.matchesExpected ?? false),
          "reverseTunnelTaskStatus: " + String(reverseTunnelTaskStatus?.state || "unknown"),
          "reverse-tunnel task exists: " + String(reverseTunnelTaskStatus?.exists ?? false),
          "ubuntuTunnelListenerStatus: " + (ubuntuTunnelListenerStatus?.allRequiredPresent ? "ready" : "failed"),
          "tunnel listener present ports: " + String((ubuntuTunnelListenerStatus?.presentPorts || []).join(", ") || "none"),
          "tunnel listener missing ports: " + String((ubuntuTunnelListenerStatus?.missingPorts || []).join(", ") || "none"),
          "readyWorkerCount: " + String(latest.readyWorkerCount ?? "0"),
          "external healthz: " + String(externalHealthStatus?.statusCode ?? "n/a") + " ok=" + String(externalHealthStatus?.ok ?? false),
          "external models: " + String(externalModelsStatus?.statusCode ?? "n/a") + " ok=" + String(externalModelsStatus?.ok ?? false),
          "external chat: " + String(externalChatStatus?.statusCode ?? "n/a") + " ok=" + String(externalChatStatus?.ok ?? false),
          "external chat worker: " + String(externalChatStatus?.workerId || "none"),
          "external model used: " + String(latest.externalModelUsed || "unknown"),
          "authenticatedSmokeTokenSource: " + String(latest.authenticatedSmokeTokenSource || "missing"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase25 external restoration loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase26UbuntuSshRecovery(latest) {
        const copy = document.getElementById("post-phase26-ubuntu-ssh-recovery-copy");
        const summary = document.getElementById("post-phase26-ubuntu-ssh-recovery-summary");
        const details = document.getElementById("post-phase26-ubuntu-ssh-recovery-details");

        if (!latest) {
          copy.textContent = "No post-phase26 Ubuntu SSH recovery result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const reverseTunnelTaskStatus = latest.reverseTunnelTaskStatus ?? null;
        const ubuntuTunnelListenerStatus = latest.ubuntuTunnelListenerStatus ?? null;
        const canonicalPublicUpstreamStatus = latest.canonicalPublicUpstreamStatus ?? null;
        const externalHealthStatus = latest.externalHealthStatus ?? null;
        const externalModelsStatus = latest.externalModelsStatus ?? null;
        const externalChatStatus = latest.externalChatStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Ubuntu SSH", latest.ubuntuSshReachable ? "reachable" : "failed"],
          ["sshFailureKind", String(latest.sshFailureKind || "none")],
          ["Ubuntu repo", String(latest.ubuntuRepoPath || "unknown")],
          ["reverse-tunnel task", String(reverseTunnelTaskStatus?.state || "unknown")],
          ["tunnel listener", ubuntuTunnelListenerStatus?.allRequiredPresent ? "ready" : "failed"],
          ["ready worker count", String(latest.readyWorkerCount ?? "0")],
          ["external chat", externalChatStatus?.ok ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "ubuntuSshReachable: " + String(latest.ubuntuSshReachable ?? false),
          "sshFailureKind: " + String(latest.sshFailureKind || "none"),
          "ubuntuRepoPath: " + String(latest.ubuntuRepoPath || "unknown"),
          "ubuntuRepoCommit: " + String(latest.ubuntuRepoCommit || "unknown"),
          "canonicalPublicUpstream: " + String(latest.canonicalPublicUpstream || "unknown"),
          "canonical upstream matches expected: " + String(canonicalPublicUpstreamStatus?.matchesExpected ?? false),
          "reverseTunnelTaskStatus: " + String(reverseTunnelTaskStatus?.state || "unknown"),
          "reverse-tunnel retainedRunning: " + String(reverseTunnelTaskStatus?.retainedRunning ?? false),
          "ubuntuTunnelListenerStatus: " + (ubuntuTunnelListenerStatus?.allRequiredPresent ? "ready" : "failed"),
          "tunnel listener present ports: " + String((ubuntuTunnelListenerStatus?.presentPorts || []).join(", ") || "none"),
          "tunnel listener missing ports: " + String((ubuntuTunnelListenerStatus?.missingPorts || []).join(", ") || "none"),
          "readyWorkerCount: " + String(latest.readyWorkerCount ?? "0"),
          "external healthz: " + String(externalHealthStatus?.statusCode ?? "n/a") + " ok=" + String(externalHealthStatus?.ok ?? false),
          "external models: " + String(externalModelsStatus?.statusCode ?? "n/a") + " ok=" + String(externalModelsStatus?.ok ?? false),
          "external chat: " + String(externalChatStatus?.statusCode ?? "n/a") + " ok=" + String(externalChatStatus?.ok ?? false),
          "external chat worker: " + String(externalChatStatus?.workerId || "none"),
          "authenticatedSmokeExecutionHost: " + String(latest.authenticatedSmokeExecutionHost || "unknown"),
          "authenticatedSmokeTokenSource: " + String(latest.authenticatedSmokeTokenSource || "missing"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase26 Ubuntu SSH recovery loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase27LocalProxyBootstrap(latest) {
        const copy = document.getElementById("post-phase27-local-proxy-bootstrap-copy");
        const summary = document.getElementById("post-phase27-local-proxy-bootstrap-summary");
        const details = document.getElementById("post-phase27-local-proxy-bootstrap-details");

        if (!latest) {
          copy.textContent = "No post-phase27 local proxy/bootstrap result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const proxyTlsStatus = latest.proxyTlsStatus ?? null;
        const proxyBackedBootstrap = latest.proxyBackedBootstrap ?? null;
        const noProxyFallback = latest.noProxyFallback ?? null;
        const finalListenerStatus = latest.finalListenerStatus ?? {};
        const finalInternalWorkerStatus = latest.finalInternalWorkerStatus?.value ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Worker", String(latest.workerId || "unknown")],
          ["gstatic TLS", proxyTlsStatus?.gstatic?.ok ? "pass" : "fail"],
          ["chatgpt TLS", proxyTlsStatus?.chatgpt?.ok ? "pass" : "fail"],
          ["proxy-backed bootstrap", String(proxyBackedBootstrap?.classification || "unknown")],
          ["no-proxy fallback", String(noProxyFallback?.classification || "unknown")],
          ["runtimeStatus", String(finalInternalWorkerStatus?.runtimeStatus || "unknown")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "proxyAddress: " + String(latest.proxyAddress || "unknown"),
          "publicBaseUrl: " + String(latest.publicBaseUrl || "unknown"),
          "share-links path: " + String(latest.shareLinksStatus?.path || "unknown"),
          "share-links entries: " + String(latest.shareLinksStatus?.entryCount ?? "0"),
          "gstatic TLS: status=" + String(proxyTlsStatus?.gstatic?.statusCode ?? "n/a") + " ok=" + String(proxyTlsStatus?.gstatic?.ok ?? false) + " errorKind=" + String(proxyTlsStatus?.gstatic?.errorKind || "none"),
          "chatgpt TLS: status=" + String(proxyTlsStatus?.chatgpt?.statusCode ?? "n/a") + " ok=" + String(proxyTlsStatus?.chatgpt?.ok ?? false) + " errorKind=" + String(proxyTlsStatus?.chatgpt?.errorKind || "none"),
          "proxyTls allPassed: " + String(proxyTlsStatus?.allPassed ?? false),
          "proxyBackedBootstrap classification: " + String(proxyBackedBootstrap?.classification || "unknown"),
          "proxyBackedBootstrap reachedReady: " + String(proxyBackedBootstrap?.reachedReady ?? false),
          "noProxyFallback requested: " + String(noProxyFallback?.requested ?? false),
          "noProxyFallback attempted: " + String(noProxyFallback?.attempted ?? false),
          "noProxyFallback classification: " + String(noProxyFallback?.classification || "unknown"),
          "4040 listener: " + String(finalListenerStatus["4040"]?.listening ?? false),
          "8081 listener: " + String(finalListenerStatus["8081"]?.listening ?? false),
          "4024 listener: " + String(finalListenerStatus["4024"]?.listening ?? false),
          "9225 listener: " + String(finalListenerStatus["9225"]?.listening ?? false),
          "runtimeStatus: " + String(finalInternalWorkerStatus?.runtimeStatus || "unknown"),
          "runtimeCapability: " + String(finalInternalWorkerStatus?.runtimeCapability || "unknown"),
          "browserContextReady: " + String(finalInternalWorkerStatus?.browserContextReady ?? "unknown"),
          "proxyServerConfigured: " + String(finalInternalWorkerStatus?.proxyServerConfigured ?? "unknown"),
          "apiTokenSource: " + String(latest.apiTokenSource || "missing"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase27 local proxy/bootstrap stabilization loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase28LocalProxyTransport(latest) {
        const copy = document.getElementById("post-phase28-local-proxy-transport-copy");
        const summary = document.getElementById("post-phase28-local-proxy-transport-summary");
        const details = document.getElementById("post-phase28-local-proxy-transport-details");

        if (!latest) {
          copy.textContent = "No post-phase28 local proxy transport result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const externalSmoke = latest.externalSmoke ?? null;
        const proxyBackedRuntime = latest.proxyBackedRuntime ?? null;
        const noProxyFallbackRuntime = latest.noProxyFallbackRuntime ?? null;
        const outboundDiagnostics = Array.isArray(latest.outboundDiagnostics)
          ? latest.outboundDiagnostics
          : [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["proxyMixedStatus", String(latest.proxyMixedStatus || "unknown")],
          ["shareLinksStatus", String(latest.shareLinksStatus?.status || "unknown")],
          ["outbound diagnostics", String(outboundDiagnostics.length)],
          ["proxy-backed runtime", String(proxyBackedRuntime?.classification || "unknown")],
          ["no-proxy fallback", String(noProxyFallbackRuntime?.classification || "unknown")],
          ["runtimePathUsed", String(latest.runtimePathUsed || "none")],
          ["external chat", externalSmoke?.chat?.ok ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "proxyMixedStatus: " + String(latest.proxyMixedStatus || "unknown"),
          "shareLinksStatus: " + String(latest.shareLinksStatus?.status || "unknown"),
          "share-links entries: " + String(latest.shareLinksStatus?.entryCount ?? "0"),
          "manualShareLinksRefreshPerformed: " + String(latest.manualShareLinksRefreshPerformed ?? false),
          "proxyMixed baseline gstatic: status=" + String(latest.proxyMixedBaseline?.gstatic?.statusCode ?? "n/a") + " ok=" + String(latest.proxyMixedBaseline?.gstatic?.ok ?? false) + " errorKind=" + String(latest.proxyMixedBaseline?.gstatic?.errorKind || "none"),
          "proxyMixed baseline chatgpt: status=" + String(latest.proxyMixedBaseline?.chatgpt?.statusCode ?? "n/a") + " ok=" + String(latest.proxyMixedBaseline?.chatgpt?.ok ?? false) + " errorKind=" + String(latest.proxyMixedBaseline?.chatgpt?.errorKind || "none"),
          "proxyMixed post-repair gstatic: status=" + String(latest.proxyMixedPostRepair?.gstatic?.statusCode ?? "n/a") + " ok=" + String(latest.proxyMixedPostRepair?.gstatic?.ok ?? false) + " errorKind=" + String(latest.proxyMixedPostRepair?.gstatic?.errorKind || "none"),
          "proxyMixed post-repair chatgpt: status=" + String(latest.proxyMixedPostRepair?.chatgpt?.statusCode ?? "n/a") + " ok=" + String(latest.proxyMixedPostRepair?.chatgpt?.ok ?? false) + " errorKind=" + String(latest.proxyMixedPostRepair?.chatgpt?.errorKind || "none"),
          "outboundDiagnostics count: " + String(outboundDiagnostics.length),
          "outbound tags: " + String(outboundDiagnostics.map((entry) => entry.tag).join(", ") || "none"),
          "proxyBackedRuntime classification: " + String(proxyBackedRuntime?.classification || "unknown"),
          "proxyBackedRuntime reachedReady: " + String(proxyBackedRuntime?.reachedReady ?? false),
          "noProxyFallbackRuntime classification: " + String(noProxyFallbackRuntime?.classification || "unknown"),
          "noProxyFallbackRuntime reachedReady: " + String(noProxyFallbackRuntime?.reachedReady ?? false),
          "runtimePathUsed: " + String(latest.runtimePathUsed || "none"),
          "external healthz: " + String(externalSmoke?.healthz?.statusCode ?? "n/a") + " ok=" + String(externalSmoke?.healthz?.ok ?? false),
          "external models: " + String(externalSmoke?.models?.statusCode ?? "n/a") + " ok=" + String(externalSmoke?.models?.ok ?? false),
          "external chat: " + String(externalSmoke?.chat?.statusCode ?? "n/a") + " ok=" + String(externalSmoke?.chat?.ok ?? false),
          "external chat worker: " + String(externalSmoke?.chat?.workerId || "none"),
          "assistant reply: " + String(externalSmoke?.chat?.assistantReplyText || "none"),
          "token source: " + String(externalSmoke?.tokenSource || "missing"),
          "blocked reason: " + String(externalSmoke?.blockedReason || "none"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase28 local proxy transport repair loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase29Shared2Chat409(latest) {
        const copy = document.getElementById("post-phase29-shared-2-chat-409-copy");
        const summary = document.getElementById("post-phase29-shared-2-chat-409-summary");
        const details = document.getElementById("post-phase29-shared-2-chat-409-details");

        if (!latest) {
          copy.textContent = "No post-phase29 shared-2 chat 409 result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const externalSmoke = latest.externalSmoke ?? null;
        const workerRuntime = latest.workerRuntime ?? null;
        const tunnelStatus = latest.temporaryReverseTunnelStatus ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["409 classification", String(latest.exact409Classification || "none")],
          ["runtimePathUsed", String(latest.runtimePathUsed || "none")],
          ["worker classification", String(workerRuntime?.classification || "unknown")],
          ["runtimeCapability", String(workerRuntime?.runtimeCapability || "unknown")],
          ["tunnels", tunnelStatus?.allListening ? "ready" : "missing"],
          ["external chat", externalSmoke?.chat?.ok ? "pass" : "fail"],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "exact409Classification: " + String(latest.exact409Classification || "none"),
          "runtimePathUsed: " + String(latest.runtimePathUsed || "none"),
          "worker classification: " + String(workerRuntime?.classification || "unknown"),
          "runtimeStatus: " + String(workerRuntime?.runtimeStatus || "unknown"),
          "runtimeCapability: " + String(workerRuntime?.runtimeCapability || "unknown"),
          "stabilityGateStatus: " + String(workerRuntime?.stabilityGateStatus || "unknown"),
          "browserContextReady: " + String(workerRuntime?.browserContextReady ?? "unknown"),
          "lastBootstrapFailureCode: " + String(workerRuntime?.lastBootstrapFailureCode || "none"),
          "lastBootstrapUsability: " + String(workerRuntime?.lastBootstrapUsability || "none"),
          "lastRelayFailureCode: " + String(workerRuntime?.lastRelayFailureCode || "none"),
          "lastRelayAt: " + String(workerRuntime?.lastRelayAt || "none"),
          "temporaryReverseTunnelStatus: " + String(tunnelStatus?.classification || "unknown"),
          "listener 14024: " + String(tunnelStatus?.listeners?.["14024"]?.listening ?? false),
          "listener 14040: " + String(tunnelStatus?.listeners?.["14040"]?.listening ?? false),
          "external healthz: " + String(externalSmoke?.healthz?.statusCode ?? "n/a") + " ok=" + String(externalSmoke?.healthz?.ok ?? false),
          "external models: " + String(externalSmoke?.models?.statusCode ?? "n/a") + " ok=" + String(externalSmoke?.models?.ok ?? false),
          "external chat: " + String(externalSmoke?.chat?.statusCode ?? "n/a") + " ok=" + String(externalSmoke?.chat?.ok ?? false),
          "external chat errorCode: " + String(externalSmoke?.chat?.errorCode || "none"),
          "external chat errorType: " + String(externalSmoke?.chat?.errorType || "none"),
          "external chat errorMessage: " + String(externalSmoke?.chat?.errorMessage || "none"),
          "external chat worker: " + String(externalSmoke?.chat?.workerId || "none"),
          "assistant reply: " + String(externalSmoke?.chat?.assistantReplyText || "none"),
          "token source: " + String(externalSmoke?.tokenSource || "missing"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase29 shared-2 chat 409 loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase30Shared2BootstrapRecovery(latest) {
        const copy = document.getElementById("post-phase30-shared-2-bootstrap-recovery-copy");
        const summary = document.getElementById("post-phase30-shared-2-bootstrap-recovery-summary");
        const details = document.getElementById("post-phase30-shared-2-bootstrap-recovery-details");

        if (!latest) {
          copy.textContent = "No post-phase30 shared-2 bootstrap recovery result captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const directBrowserEvidence = latest.directBrowserEvidence ?? null;
        const truthReconciliation = latest.truthReconciliation ?? null;
        const publicRerun = latest.publicRerun ?? null;
        const hostWorker = latest.hostControllerWorker ?? null;
        const internalWorker = latest.internalWorker ?? null;
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Exact branch", String(latest.exactBootstrapClassification || "none")],
          ["Recovery branch", String(latest.recoveryBranch || "none")],
          ["worker truth", String(truthReconciliation?.classification || "unknown")],
          ["public rerun", publicRerun?.chat?.ok ? "pass" : "blocked_or_failed"],
          ["page title", String(directBrowserEvidence?.pageTitle || "none")],
          ["page URL", String(directBrowserEvidence?.pageUrl || "none")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "exactBootstrapClassification: " + String(latest.exactBootstrapClassification || "none"),
          "recoveryBranch: " + String(latest.recoveryBranch || "none"),
          "runtimePathUsed: " + String(latest.runtimePathUsed || "none"),
          "publicRerunBlockedReason: " + String(publicRerun?.blockedReason || "none"),
          "truth reconciliation: " + String(truthReconciliation?.classification || "unknown"),
          "hostController worker visible: " + String(truthReconciliation?.hostControllerVisible ?? false),
          "internal worker found: " + String(truthReconciliation?.internalWorkerFound ?? false),
          "pageUrl: " + String(directBrowserEvidence?.pageUrl || "none"),
          "pageTitle: " + String(directBrowserEvidence?.pageTitle || "none"),
          "dialogSurfaceMarkers: " + String((directBrowserEvidence?.surfaceMarkers || []).join(", ") || "none"),
          "bootstrapStep: " + String(directBrowserEvidence?.bootstrapStep || internalWorker?.lastBootstrapStep || "none"),
          "bootstrapFailureCode: " + String(directBrowserEvidence?.bootstrapFailureCode || internalWorker?.lastBootstrapFailureCode || "none"),
          "host runtimeStatus: " + String(hostWorker?.runtimeStatus || "unknown"),
          "internal runtimeStatus: " + String(internalWorker?.runtimeStatus || "unknown"),
          "internal status: " + String(internalWorker?.status || "unknown"),
          "browserContextReady: " + String(internalWorker?.browserContextReady ?? "unknown"),
          "public healthz: " + String(publicRerun?.healthz?.statusCode ?? "n/a") + " ok=" + String(publicRerun?.healthz?.ok ?? false),
          "public models: " + String(publicRerun?.models?.statusCode ?? "n/a") + " ok=" + String(publicRerun?.models?.ok ?? false),
          "public chat: " + String(publicRerun?.chat?.statusCode ?? "n/a") + " ok=" + String(publicRerun?.chat?.ok ?? false),
          "public chat errorCode: " + String(publicRerun?.chat?.errorCode || "none"),
          "public chat errorMessage: " + String(publicRerun?.chat?.errorMessage || "none"),
          "public chat worker: " + String(publicRerun?.chat?.workerId || "none"),
          "assistant reply: " + String(publicRerun?.chat?.assistantReplyText || "none"),
          "token source: " + String(publicRerun?.tokenSource || "missing"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase30 shared-2 bootstrap recovery loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase31AccountSurfaceInventory(latest) {
        const copy = document.getElementById("post-phase31-account-surface-inventory-copy");
        const summary = document.getElementById("post-phase31-account-surface-inventory-summary");
        const details = document.getElementById("post-phase31-account-surface-inventory-details");

        if (!latest) {
          copy.textContent = "No post-phase31 local account surface inventory captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const counts = latest.counts ?? {};
        const workers = Array.isArray(latest.workers) ? latest.workers : [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["nextCanary", String(latest.nextCanary || "none")],
          ["manual confirm", String(latest.nextCanaryRequiresManualConfirm ?? false)],
          ["ready profiles", String(counts.ready ?? 0)],
          ["needs_manual_confirm", String(counts.needs_manual_confirm ?? 0)],
          ["needs_login", String(counts.needs_login ?? 0)],
          ["runtime_blocked", String(counts.runtime_blocked ?? 0)],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "nextCanary: " + String(latest.nextCanary || "none"),
          "nextCanaryReason: " + String(latest.nextCanaryReason || "none"),
          "nextCanaryRequiresManualConfirm: " + String(latest.nextCanaryRequiresManualConfirm ?? false),
          "workerCount: " + String(latest.workerCount ?? workers.length),
          "ready: " + String(counts.ready ?? 0),
          "needs_manual_confirm: " + String(counts.needs_manual_confirm ?? 0),
          "needs_login: " + String(counts.needs_login ?? 0),
          "broken_surface: " + String(counts.broken_surface ?? 0),
          "runtime_blocked: " + String(counts.runtime_blocked ?? 0),
          "unknown: " + String(counts.unknown ?? 0),
          ...workers.map((worker) =>
            "worker " +
            String(worker.workerId || "unknown") +
            ": classification=" + String(worker.classification || "unknown") +
            ", acceptableAsNextCanary=" + String(worker.acceptableAsNextCanary ?? false) +
            ", manualConfirmRequired=" + String(worker.manualConfirmRequired ?? false) +
            ", screenshotPath=" + String(worker.screenshotPath || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase31 local account surface inventory loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase31SelectedCanaryChatRecovery(latest) {
        const copy = document.getElementById("post-phase31-selected-canary-chat-recovery-copy");
        const summary = document.getElementById("post-phase31-selected-canary-chat-recovery-summary");
        const details = document.getElementById("post-phase31-selected-canary-chat-recovery-details");

        if (!latest) {
          copy.textContent = "No post-phase31 selected canary chat recovery captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const externalSmoke = latest.externalSmoke ?? {};
        const chat = externalSmoke.chat ?? {};
        const truth = latest.truthReconciliation ?? {};
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["workerId", String(latest.workerId || "unknown")],
          ["selectedCanaryClassification", String(latest.selectedCanaryClassification || "unknown")],
          ["runtimeUsability", String(latest.runtimeUsability || "unknown")],
          ["shared2Deferred", String(latest.shared2Deferred ?? false)],
          ["chat status", String(chat.statusCode ?? "none")],
          ["truth reconciliation", String(truth.classification || "unknown")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "workerId: " + String(latest.workerId || "unknown"),
          "selectedCanaryDisplayName: " + String(latest.selectedCanaryDisplayName || "unknown"),
          "selectedCanaryClassification: " + String(latest.selectedCanaryClassification || "unknown"),
          "runtimeUsability: " + String(latest.runtimeUsability || "unknown"),
          "runtimePathUsed: " + String(latest.runtimePathUsed || "unknown"),
          "shared2Deferred: " + String(latest.shared2Deferred ?? false),
          "shared2DeferredReason: " + String(latest.shared2DeferredReason || "none"),
          "truth reconciliation: " + String(truth.classification || "unknown"),
          "hostControllerVisible: " + String(truth.hostControllerVisible ?? false),
          "internalWorkerFound: " + String(truth.internalWorkerFound ?? false),
          "cdpVisible: " + String(truth.cdpVisible ?? false),
          "direct pageUrl: " + String(latest.directBrowserEvidence?.pageUrl || "none"),
          "dialogSurfaceMarkers: " + String(
            Array.isArray(latest.directBrowserEvidence?.surfaceMarkers) && latest.directBrowserEvidence.surfaceMarkers.length > 0
              ? latest.directBrowserEvidence.surfaceMarkers.join(", ")
              : "none"
          ),
          "reverseTunnel classification: " + String(latest.temporaryReverseTunnelStatus?.classification || "unknown"),
          "selected tunnel listening: " + String(
            latest.temporaryReverseTunnelStatus?.listeners &&
            latest.workerInfo?.tunnelPort &&
            latest.temporaryReverseTunnelStatus.listeners[String(latest.workerInfo.tunnelPort)]?.listening
          ),
          "14040 listening: " + String(latest.temporaryReverseTunnelStatus?.listeners?.["14040"]?.listening ?? false),
          "external blockedReason: " + String(externalSmoke.blockedReason || "none"),
          "external healthz: " + String(externalSmoke.healthz?.statusCode ?? "none"),
          "external models: " + String(externalSmoke.models?.statusCode ?? "none"),
          "external chat: " + String(chat.statusCode ?? "none"),
          "external chat errorCode: " + String(chat.errorCode || "none"),
          "assistant reply: " + String(chat.assistantReplyText || "none"),
          "token source: " + String(externalSmoke.tokenSource || "missing"),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase31 selected canary chat recovery loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase32RotatingReadyAccountChatProof(latest) {
        const copy = document.getElementById("post-phase32-rotating-ready-account-chat-proof-copy");
        const summary = document.getElementById("post-phase32-rotating-ready-account-chat-proof-summary");
        const details = document.getElementById("post-phase32-rotating-ready-account-chat-proof-details");

        if (!latest) {
          copy.textContent = "No post-phase32 rotating ready-account chat proof captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const candidateOrder = Array.isArray(latest.candidateOrder)
          ? latest.candidateOrder
          : [];
        const attemptedWorkers = Array.isArray(latest.attemptedWorkers)
          ? latest.attemptedWorkers
          : [];
        const skippedWorkers = Array.isArray(latest.skippedWorkers)
          ? latest.skippedWorkers
          : [];
        const attempts = Array.isArray(latest.attempts)
          ? latest.attempts
          : [];
        const commonBlocker = latest.commonBlocker ?? {};
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["successfulWorkerId", String(latest.successfulWorkerId || "none")],
          ["attemptedWorkers", String(attemptedWorkers.length)],
          ["candidateOrder", String(candidateOrder.length)],
          ["commonBlocker", String(commonBlocker.key || latest.exhaustionReason || "none")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "candidateOrder: " + (candidateOrder.length > 0 ? candidateOrder.join(", ") : "none"),
          "attemptedWorkers: " + (attemptedWorkers.length > 0 ? attemptedWorkers.join(", ") : "none"),
          "successfulWorkerId: " + String(latest.successfulWorkerId || "none"),
          "firstSuccessfulAttemptIndex: " + String(latest.firstSuccessfulAttemptIndex ?? "none"),
          "commonBlocker: " + String(commonBlocker.key || "none"),
          "commonBlocker blockedReason: " + String(commonBlocker.blockedReason || "none"),
          "commonBlocker errorCode: " + String(commonBlocker.errorCode || "none"),
          "commonBlocker errorMessage: " + String(commonBlocker.errorMessage || "none"),
          "exhaustionReason: " + String(latest.exhaustionReason || "none"),
          "skippedWorkers: " + (
            skippedWorkers.length > 0
              ? skippedWorkers.map((worker) =>
                  String(worker.workerId || "unknown") + "=" + String(worker.reason || "unknown")
                ).join(", ")
              : "none"
          ),
          ...attempts.map((attempt) =>
            "attempt " +
            String(attempt.attemptIndex ?? "?") +
            " worker=" + String(attempt.workerId || "unknown") +
            " classification=" + String(attempt.selectedCanaryClassification || "unknown") +
            " runtimeUsability=" + String(attempt.runtimeUsability || "unknown") +
            " chatStatus=" + String(attempt.externalSmoke?.chat?.statusCode ?? "none") +
            " chatErrorCode=" + String(attempt.externalSmoke?.chat?.errorCode || "none") +
            " blockedReason=" + String(attempt.externalSmoke?.blockedReason || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase32 rotating ready-account chat proof loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase33AccountBrowserIsolation(latest) {
        const copy = document.getElementById("post-phase33-account-browser-isolation-copy");
        const summary = document.getElementById("post-phase33-account-browser-isolation-summary");
        const details = document.getElementById("post-phase33-account-browser-isolation-details");

        if (!latest) {
          copy.textContent = "No post-phase33 account browser isolation captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const accountOrder = Array.isArray(latest.accountOrder)
          ? latest.accountOrder
          : [];
        const workers = Array.isArray(latest.workers)
          ? latest.workers
          : [];
        const duplicateBrowserRoots = Array.isArray(latest.duplicateBrowserRoots)
          ? latest.duplicateBrowserRoots
          : [];
        const duplicateBrowserDataPaths = Array.isArray(latest.duplicateBrowserDataPaths)
          ? latest.duplicateBrowserDataPaths
          : [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["manualInspectionReady", String(latest.manualInspectionReady ?? false)],
          ["successfulIsolationCount", String(latest.successfulIsolationCount ?? 0)],
          ["failedIsolationCount", String(latest.failedIsolationCount ?? 0)],
          ["duplicate roots", String(duplicateBrowserRoots.length + duplicateBrowserDataPaths.length)],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "accountOrder: " + (accountOrder.length > 0 ? accountOrder.join(", ") : "none"),
          "browserRootBasePath: " + String(latest.browserRootBasePath || "none"),
          "sourceInstallPath: " + String(latest.sourceInstallPath || "none"),
          "duplicateBrowserRoots: " + (duplicateBrowserRoots.length > 0 ? duplicateBrowserRoots.join(", ") : "none"),
          "duplicateBrowserDataPaths: " + (duplicateBrowserDataPaths.length > 0 ? duplicateBrowserDataPaths.join(", ") : "none"),
          ...workers.map((worker) =>
            "worker " +
            String(worker.workerId || "unknown") +
            " launchResult=" + String(worker.launchResult || "unknown") +
            " windowKeptOpen=" + String(worker.windowKeptOpen ?? false) +
            " crossAccountReuseDetected=" + String(worker.crossAccountReuseDetected ?? false) +
            " browserRootPath=" + String(worker.browserRootPath || "none") +
            " browserDataPath=" + String(worker.browserDataPath || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase33 account browser isolation loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase33IsolatedExternalChatProof(latest) {
        const copy = document.getElementById("post-phase33-isolated-external-chat-proof-copy");
        const summary = document.getElementById("post-phase33-isolated-external-chat-proof-summary");
        const details = document.getElementById("post-phase33-isolated-external-chat-proof-details");

        if (!latest) {
          copy.textContent = "No post-phase33 isolated external chat proof captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const accountOrder = Array.isArray(latest.accountOrder)
          ? latest.accountOrder
          : [];
        const attempts = Array.isArray(latest.attempts)
          ? latest.attempts
          : [];
        const preflightAccounts = Array.isArray(latest.preflightAccounts)
          ? latest.preflightAccounts
          : [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["successfulWorkerId", String(latest.successfulWorkerId || "none")],
          ["token source", String(latest.tokenSource || "unknown")],
          ["attemptedWorkers", String(attempts.filter((attempt) => !attempt.skipped).length)],
          ["commonBlocker", String(latest.commonBlocker || "none")],
          ["Compatibility", String(latest.scriptCompatibilityVersion || "unknown")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "accountOrder: " + (accountOrder.length > 0 ? accountOrder.join(", ") : "none"),
          "commonBlocker: " + String(latest.commonBlocker || "none"),
          "exhaustionReason: " + String(latest.exhaustionReason || "none"),
          "tokenSource: " + String(latest.tokenSource || "unknown"),
          "preflight ready count: " + String(preflightAccounts.filter((account) => account.classification === "ready").length),
          ...preflightAccounts.map((account) =>
            "preflight " +
            String(account.workerId || "unknown") +
            " classification=" + String(account.classification || "unknown") +
            " hasComposer=" + String(account.hasComposer ?? false) +
            " pageUrl=" + String(account.pageUrl || "none")
          ),
          ...attempts.map((attempt) =>
            "attempt " +
            String(attempt.workerId || "unknown") +
            " skipped=" + String(attempt.skipped ?? false) +
            " attemptVerdict=" + String(attempt.attemptVerdict || "unknown") +
            " skipReason=" + String(attempt.skipReason || "none") +
            " chatStatus=" + String(attempt.externalSmoke?.chat?.statusCode ?? "none") +
            " external chat errorCode=" + String(attempt.externalSmoke?.chat?.errorCode || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase33 isolated external chat proof loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase34ServerIsolatedChatTransfer(latest) {
        const copy = document.getElementById("post-phase34-server-isolated-chat-transfer-copy");
        const summary = document.getElementById("post-phase34-server-isolated-chat-transfer-summary");
        const details = document.getElementById("post-phase34-server-isolated-chat-transfer-details");

        if (!latest) {
          copy.textContent = "No post-phase34 server isolated chat transfer captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const transferResults = Array.isArray(latest.transferResults)
          ? latest.transferResults
          : [];
        const attempts = Array.isArray(latest.attempts)
          ? latest.attempts
          : [];
        const serverAccountInventory = Array.isArray(latest.serverAccountInventory)
          ? latest.serverAccountInventory
          : [];
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["successfulWorkerId", String(latest.successfulWorkerId || "none")],
          ["Windows commit", String(latest.windowsCommit || "unknown")],
          ["Ubuntu commit", String(latest.ubuntuCommit || "unknown")],
          ["transferResults", String(transferResults.length)],
          ["commonBlocker", String(latest.commonBlocker || "none")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "githubBranch: " + String(latest.githubBranch || "unknown"),
          "windowsRepoPath: " + String(latest.windowsRepoPath || "unknown"),
          "ubuntuRepoPath: " + String(latest.ubuntuRepoPath || "unknown"),
          "tokenSource: " + String(latest.tokenSource || "none"),
          "canonicalPublicUpstream: " + String(latest.canonicalPublicUpstream || "unconfirmed"),
          "serverAccountInventory count: " + String(serverAccountInventory.length),
          ...serverAccountInventory.map((account) =>
            "inventory " +
            String(account.workerId || "unknown") +
            " copyResult=" + String(account.copyResult || "unknown") +
            " crossAccountReuseDetected=" + String(account.crossAccountReuseDetected ?? false)
          ),
          ...transferResults.map((transfer) =>
            "transfer " +
            String(transfer.workerId || "unknown") +
            " browserRootPath=" + String(transfer.browserRootPath || "none") +
            " browserDataPath=" + String(transfer.browserDataPath || "none") +
            " sourceBrowserDataPath=" + String(transfer.sourceBrowserDataPath || "none") +
            " copyResult=" + String(transfer.copyResult || "unknown") +
            " crossAccountReuseDetected=" + String(transfer.crossAccountReuseDetected ?? false)
          ),
          ...attempts.map((attempt) =>
            "attempt " +
            String(attempt.workerId || "unknown") +
            " attemptVerdict=" + String(attempt.attemptVerdict || "unknown") +
            " chatStatus=" + String(attempt.externalSmoke?.chat?.statusCode ?? "none") +
            " external chat errorCode=" + String(attempt.externalSmoke?.chat?.errorCode || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase34 server isolated external chat proof loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase35ServerTokenSshListenerRecovery(latest) {
        const copy = document.getElementById("post-phase35-server-token-ssh-listener-recovery-copy");
        const summary = document.getElementById("post-phase35-server-token-ssh-listener-recovery-summary");
        const details = document.getElementById("post-phase35-server-token-ssh-listener-recovery-details");

        if (!latest) {
          copy.textContent = "No post-phase35 server token SSH listener recovery captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const sshReachability = Array.isArray(latest.ubuntuSshReachability)
          ? latest.ubuntuSshReachability
          : [];
        const listenerTruth = latest.ubuntuListenerTruth || {};
        const externalSmoke = latest.externalSmoke || {};
        const tokenResolution = latest.tokenResolution || {};
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Token status", String(tokenResolution.status || "unknown")],
          ["Token source", String(tokenResolution.source || "missing")],
          ["Selected Ubuntu host", String(latest.selectedUbuntuHost || "none")],
          ["Listeners ready", String(listenerTruth.allRequiredPresent ?? false)],
          ["Next blocker", String(latest.nextBlocker || "none")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "recoveryStageVerdict: " + String(latest.recoveryStageVerdict || "unknown"),
          "secretValueRecorded: " + String(tokenResolution.secretValueRecorded ?? false),
          "ubuntuRepoPath: " + String(latest.ubuntuRepoPath || "unknown"),
          "ubuntuCommit: " + String(latest.ubuntuCommit || "unknown"),
          "nginxConfigOk: " + String(latest.ubuntuNginxConfigOk ?? false),
          "canonicalPublicUpstream: " + String(latest.canonicalPublicUpstream || "unconfirmed"),
          "presentPorts: " + String((listenerTruth.presentPorts || []).join ? listenerTruth.presentPorts.join(", ") : "none"),
          "missingPorts: " + String((listenerTruth.missingPorts || []).join ? listenerTruth.missingPorts.join(", ") : "none"),
          "external healthz: " + statusDetail(latest.externalHealthz),
          "external models: " + statusDetail(externalSmoke.models),
          "external chat: " + statusDetail(externalSmoke.chatCompletions),
          "revalidationAttempted: " + String(latest.revalidationAttempted ?? false),
          "phase35 robocopyExitCode11: " + String(latest.phase35CarryForward?.robocopyExitCode11 ?? false),
          ...sshReachability.map((entry) =>
            "ssh " +
            String(entry.host || "unknown") +
            ":" + String(entry.port || "unknown") +
            " reachable=" + String(entry.reachable ?? false) +
            " failureKind=" + String(entry.failureKind || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase35 server token SSH listener recovery loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderPostPhase36ReverseTunnelChatSmoke(latest) {
        const copy = document.getElementById("post-phase36-reverse-tunnel-chat-smoke-copy");
        const summary = document.getElementById("post-phase36-reverse-tunnel-chat-smoke-summary");
        const details = document.getElementById("post-phase36-reverse-tunnel-chat-smoke-details");

        if (!latest) {
          copy.textContent = "No post-phase36 reverse tunnel chat smoke captured yet.";
          summary.innerHTML = "";
          details.innerHTML = "";
          return;
        }

        const sshReachability = Array.isArray(latest.ubuntuSshReachability)
          ? latest.ubuntuSshReachability
          : [];
        const listenerTruth = latest.ubuntuListenerTruth || {};
        const externalSmoke = latest.externalSmoke || {};
        const tokenResolution = latest.tokenResolution || {};
        const tunnelStart = latest.tunnelStart || {};
        const cards = [
          ["Verdict", String(latest.verdict || "unknown")],
          ["Token status", String(tokenResolution.status || "unknown")],
          ["Tunnel owner", String(tunnelStart.owner || "none")],
          ["Listeners ready", String(listenerTruth.allRequiredPresent ?? false)],
          ["External chat", statusDetail(externalSmoke.chatCompletions)],
          ["Next blocker", String(latest.nextBlocker || "none")]
        ];
        const detailItems = [
          "Captured: " + formatWhen(latest.generatedAt || latest.checkedAt),
          "secretValueRecorded: " + String(tokenResolution.secretValueRecorded ?? false),
          "token source: " + String(tokenResolution.source || "missing"),
          "selectedUbuntuHost: " + String(latest.selectedUbuntuHost || "none"),
          "ubuntuRepoPath: " + String(latest.ubuntuRepoPath || "unknown"),
          "ubuntuCommit: " + String(latest.ubuntuCommit || "unknown"),
          "nginxConfigOk: " + String(latest.ubuntuNginxConfigOk ?? false),
          "canonicalPublicUpstream: " + String(latest.canonicalPublicUpstream || "unconfirmed"),
          "tunnel taskStartAttempted: " + String(tunnelStart.taskStartAttempted ?? false),
          "tunnel directStartAttempted: " + String(tunnelStart.directStartAttempted ?? false),
          "tunnel owner: " + String(tunnelStart.owner || "none"),
          "presentPorts: " + String((listenerTruth.presentPorts || []).join ? listenerTruth.presentPorts.join(", ") : "none"),
          "missingPorts: " + String((listenerTruth.missingPorts || []).join ? listenerTruth.missingPorts.join(", ") : "none"),
          "external healthz: " + statusDetail(externalSmoke.healthz || latest.externalHealthz),
          "external models: " + statusDetail(externalSmoke.models),
          "external chat: " + statusDetail(externalSmoke.chatCompletions),
          "revalidationAttempted: " + String(latest.revalidationAttempted ?? false),
          ...sshReachability.map((entry) =>
            "ssh " +
            String(entry.host || "unknown") +
            ":" + String(entry.port || "unknown") +
            " reachable=" + String(entry.reachable ?? false) +
            " failureKind=" + String(entry.failureKind || "none")
          ),
          "scriptCompatibilityVersion: " + String(latest.scriptCompatibilityVersion || "unknown")
        ];

        copy.textContent =
          latest.summary ||
          "Latest post-phase36 reverse tunnel chat smoke loaded from the internal latest-state artifact.";
        summary.innerHTML = cards.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");
        details.innerHTML = detailItems.map((detail) => \`
          <li>\${escapeHtml(detail)}</li>
        \`).join("");
      }

      function renderHostPool(pool) {
        currentHostPool = pool;

        const badge = document.getElementById("host-pool-status-badge");
        badge.className = "badge " + poolStatusSeverity(pool.status);
        badge.textContent = pool.status;

        document.getElementById("host-pool-status-copy").textContent =
          describeHostPoolStatus(pool.status);

        const meta = [
          ["Proxy listening", pool.proxyListening ? "yes" : "no"],
          ["Controller reachable", pool.controllerReachable ? "yes" : "no"],
          ["Routine runtime", pool.routineRuntimeClass || pool.routineRuntimeMode || "unknown"],
          ["Routine window mode", pool.routineBrowserWindowMode || "unknown"],
          ["Last action", pool.lastAction || "none"],
          ["Updated", formatWhen(pool.updatedAt)],
          ["Workers tracked", String(pool.workers.length)],
          ["Last error", pool.lastError || "none"]
        ];

        document.getElementById("host-pool-meta").innerHTML = meta.map(([label, value]) => \`
          <div class="count-card">
            <strong>\${escapeHtml(value)}</strong>
            <span>\${escapeHtml(label)}</span>
          </div>
        \`).join("");

        const startButton = document.getElementById("host-pool-start");
        const startAlternateButton = document.getElementById("host-pool-start-alternate");
        const stopButton = document.getElementById("host-pool-stop");
        const actionPending = pendingPoolAction !== null || pool.status === "starting" || pool.status === "stopping";

        startButton.disabled =
          actionPending || pool.status === "ready" || pool.status === "degraded";
        startAlternateButton.disabled =
          actionPending || pool.status === "ready" || pool.status === "degraded";
        stopButton.disabled =
          actionPending || pool.status === "idle";
      }

      function renderEvents(targetId, events, emptyText) {
        const container = document.getElementById(targetId);

        if (!events.length) {
          container.innerHTML = '<li class="empty">' + escapeHtml(emptyText) + "</li>";
          return;
        }

        container.innerHTML = events.map((event) => \`
          <li>
            <div>
              <span class="badge \${severityClass(event.severity)}">\${escapeHtml(event.severity)}</span>
              <strong>\${escapeHtml(event.summary)}</strong>
            </div>
            <div class="event-meta">
              <span>\${escapeHtml(event.eventType)}</span>
              <span>\${escapeHtml(formatWhen(event.occurredAt))}</span>
              <span>\${escapeHtml(event.workerId ? "worker: " + event.workerId : "worker: n/a")}</span>
              <span>\${escapeHtml(event.sessionId ? "session: " + event.sessionId : "session: n/a")}</span>
            </div>
          </li>
        \`).join("");
      }

      async function loadSnapshot() {
        const [poolResponse, summaryResponse, eventsResponse, workersResponse, rolloutSmokeResponse, readinessRecoveryResponse, postRecoveryRegressionResponse, zeroReadyRootCauseResponse, disconnectedBaselineRemediationResponse, postRemediationDegradedSmokeResponse, postStabilizationRuntimeInvestigationResponse, disconnectedRuntimeRemediationResponse, persistentDisconnectedRuntimeFollowupResponse, runtimeParityBackportRemediationResponse, postParityDisconnectedRuntimeRemediationResponse, postPhase21DisconnectedRuntimeFollowupResponse, postPhase22SmokeWrapperParityRemediationResponse, postPhase23ExactSmokeWrapperCompatRemediationResponse, postPhase24ExternalApiReadinessResponse, postPhase25ExternalRestorationResponse, postPhase26UbuntuSshRecoveryResponse, postPhase27LocalProxyBootstrapResponse, postPhase28LocalProxyTransportResponse, postPhase29Shared2Chat409Response, postPhase30Shared2BootstrapRecoveryResponse, postPhase31AccountSurfaceInventoryResponse, postPhase31SelectedCanaryChatRecoveryResponse, postPhase32RotatingReadyAccountChatProofResponse, postPhase33AccountBrowserIsolationResponse, postPhase33IsolatedExternalChatProofResponse, postPhase34ServerIsolatedChatTransferResponse, postPhase35ServerTokenSshListenerRecoveryResponse, postPhase36ReverseTunnelChatSmokeResponse] = await Promise.all([
          fetch("/internal/host-pool"),
          fetch("/internal/observability/summary"),
          fetch("/internal/observability/events?limit=50"),
          fetch("/internal/workers/"),
          fetch("/internal/rollout-smoke/latest"),
          fetch("/internal/readiness-recovery/latest"),
          fetch("/internal/post-recovery-regression/latest"),
          fetch("/internal/zero-ready-root-cause/latest"),
          fetch("/internal/disconnected-baseline-remediation/latest"),
          fetch("/internal/post-remediation-degraded-smoke/latest"),
          fetch("/internal/post-stabilization-runtime-investigation/latest"),
          fetch("/internal/disconnected-runtime-remediation/latest"),
          fetch("/internal/persistent-disconnected-runtime-followup/latest"),
          fetch("/internal/runtime-parity-backport-remediation/latest"),
          fetch("/internal/post-parity-disconnected-runtime-remediation/latest"),
          fetch("/internal/post-phase21-disconnected-runtime-followup/latest"),
          fetch("/internal/post-phase22-smoke-wrapper-parity-remediation/latest"),
          fetch("/internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest"),
          fetch("/internal/post-phase24-external-api-readiness/latest"),
          fetch("/internal/post-phase25-external-restoration/latest"),
          fetch("/internal/post-phase26-ubuntu-ssh-recovery/latest"),
          fetch("/internal/post-phase27-local-proxy-bootstrap/latest"),
          fetch("/internal/post-phase28-local-proxy-transport/latest"),
          fetch("/internal/post-phase29-shared-2-chat-409/latest"),
          fetch("/internal/post-phase30-shared-2-bootstrap-recovery/latest"),
          fetch("/internal/post-phase31-account-surface-inventory/latest"),
          fetch("/internal/post-phase31-selected-canary-chat-recovery/latest"),
          fetch("/internal/post-phase32-rotating-ready-account-chat-proof/latest"),
          fetch("/internal/post-phase33-account-browser-isolation/latest"),
          fetch("/internal/post-phase33-isolated-external-chat-proof/latest"),
          fetch("/internal/post-phase34-server-isolated-chat-transfer/latest"),
          fetch("/internal/post-phase35-server-token-ssh-listener-recovery/latest"),
          fetch("/internal/post-phase36-reverse-tunnel-chat-smoke/latest")
        ]);

        if (!poolResponse.ok || !summaryResponse.ok || !eventsResponse.ok || !workersResponse.ok || !rolloutSmokeResponse.ok || !readinessRecoveryResponse.ok || !postRecoveryRegressionResponse.ok || !zeroReadyRootCauseResponse.ok || !disconnectedBaselineRemediationResponse.ok || !postRemediationDegradedSmokeResponse.ok || !postStabilizationRuntimeInvestigationResponse.ok || !disconnectedRuntimeRemediationResponse.ok || !persistentDisconnectedRuntimeFollowupResponse.ok || !runtimeParityBackportRemediationResponse.ok || !postParityDisconnectedRuntimeRemediationResponse.ok || !postPhase21DisconnectedRuntimeFollowupResponse.ok || !postPhase22SmokeWrapperParityRemediationResponse.ok || !postPhase23ExactSmokeWrapperCompatRemediationResponse.ok || !postPhase24ExternalApiReadinessResponse.ok || !postPhase25ExternalRestorationResponse.ok || !postPhase26UbuntuSshRecoveryResponse.ok || !postPhase27LocalProxyBootstrapResponse.ok || !postPhase28LocalProxyTransportResponse.ok || !postPhase29Shared2Chat409Response.ok || !postPhase30Shared2BootstrapRecoveryResponse.ok || !postPhase31AccountSurfaceInventoryResponse.ok || !postPhase31SelectedCanaryChatRecoveryResponse.ok || !postPhase32RotatingReadyAccountChatProofResponse.ok || !postPhase33AccountBrowserIsolationResponse.ok || !postPhase33IsolatedExternalChatProofResponse.ok || !postPhase34ServerIsolatedChatTransferResponse.ok || !postPhase35ServerTokenSshListenerRecoveryResponse.ok || !postPhase36ReverseTunnelChatSmokeResponse.ok) {
          throw new Error("Internal observability endpoints are unavailable");
        }

        const poolPayload = await poolResponse.json();
        const summary = await summaryResponse.json();
        const events = await eventsResponse.json();
        const workersPayload = await workersResponse.json();
        const rolloutSmokePayload = await rolloutSmokeResponse.json();
        const readinessRecoveryPayload = await readinessRecoveryResponse.json();
        const postRecoveryRegressionPayload = await postRecoveryRegressionResponse.json();
        const zeroReadyRootCausePayload = await zeroReadyRootCauseResponse.json();
        const disconnectedBaselineRemediationPayload = await disconnectedBaselineRemediationResponse.json();
        const postRemediationDegradedSmokePayload = await postRemediationDegradedSmokeResponse.json();
        const postStabilizationRuntimeInvestigationPayload = await postStabilizationRuntimeInvestigationResponse.json();
        const disconnectedRuntimeRemediationPayload = await disconnectedRuntimeRemediationResponse.json();
        const persistentDisconnectedRuntimeFollowupPayload = await persistentDisconnectedRuntimeFollowupResponse.json();
        const runtimeParityBackportRemediationPayload = await runtimeParityBackportRemediationResponse.json();
        const postParityDisconnectedRuntimeRemediationPayload = await postParityDisconnectedRuntimeRemediationResponse.json();
        const postPhase21DisconnectedRuntimeFollowupPayload = await postPhase21DisconnectedRuntimeFollowupResponse.json();
        const postPhase22SmokeWrapperParityRemediationPayload = await postPhase22SmokeWrapperParityRemediationResponse.json();
        const postPhase23ExactSmokeWrapperCompatRemediationPayload = await postPhase23ExactSmokeWrapperCompatRemediationResponse.json();
        const postPhase24ExternalApiReadinessPayload = await postPhase24ExternalApiReadinessResponse.json();
        const postPhase25ExternalRestorationPayload = await postPhase25ExternalRestorationResponse.json();
        const postPhase26UbuntuSshRecoveryPayload = await postPhase26UbuntuSshRecoveryResponse.json();
        const postPhase27LocalProxyBootstrapPayload = await postPhase27LocalProxyBootstrapResponse.json();
        const postPhase28LocalProxyTransportPayload = await postPhase28LocalProxyTransportResponse.json();
        const postPhase29Shared2Chat409Payload = await postPhase29Shared2Chat409Response.json();
        const postPhase30Shared2BootstrapRecoveryPayload = await postPhase30Shared2BootstrapRecoveryResponse.json();
        const postPhase31AccountSurfaceInventoryPayload = await postPhase31AccountSurfaceInventoryResponse.json();
        const postPhase31SelectedCanaryChatRecoveryPayload = await postPhase31SelectedCanaryChatRecoveryResponse.json();
        const postPhase32RotatingReadyAccountChatProofPayload = await postPhase32RotatingReadyAccountChatProofResponse.json();
        const postPhase33AccountBrowserIsolationPayload = await postPhase33AccountBrowserIsolationResponse.json();
        const postPhase33IsolatedExternalChatProofPayload = await postPhase33IsolatedExternalChatProofResponse.json();
        const postPhase34ServerIsolatedChatTransferPayload = await postPhase34ServerIsolatedChatTransferResponse.json();
        const postPhase35ServerTokenSshListenerRecoveryPayload = await postPhase35ServerTokenSshListenerRecoveryResponse.json();
        const postPhase36ReverseTunnelChatSmokePayload = await postPhase36ReverseTunnelChatSmokeResponse.json();
        const workers = workersPayload.workers ?? [];
        const lifecycleEvents = events.filter((event) => lifecycleEventTypes.has(event.eventType));
        const browserAccessResults = await Promise.all(
          workers.map(async (worker) => [worker.workerId, await loadBrowserAccess(worker.workerId)])
        );

        browserAccessByWorker.clear();
        for (const [workerId, browserAccess] of browserAccessResults) {
          browserAccessByWorker.set(workerId, browserAccess);
        }

        renderHostPool(poolPayload.pool);
        renderRolloutSmoke(rolloutSmokePayload.latest ?? null);
        renderReadinessRecovery(readinessRecoveryPayload.latest ?? null);
        renderPostRecoveryRegression(postRecoveryRegressionPayload.latest ?? null);
        renderZeroReadyRootCause(zeroReadyRootCausePayload.latest ?? null);
        renderDisconnectedBaselineRemediation(disconnectedBaselineRemediationPayload.latest ?? null);
        renderPostRemediationDegradedSmoke(postRemediationDegradedSmokePayload.latest ?? null);
        renderPostStabilizationRuntimeInvestigation(postStabilizationRuntimeInvestigationPayload.latest ?? null);
        renderDisconnectedRuntimeRemediation(disconnectedRuntimeRemediationPayload.latest ?? null);
        renderPersistentDisconnectedRuntimeFollowup(persistentDisconnectedRuntimeFollowupPayload.latest ?? null);
        renderRuntimeParityBackportRemediation(runtimeParityBackportRemediationPayload.latest ?? null);
        renderPostParityDisconnectedRuntimeRemediation(postParityDisconnectedRuntimeRemediationPayload.latest ?? null);
        renderPostPhase21DisconnectedRuntimeFollowup(postPhase21DisconnectedRuntimeFollowupPayload.latest ?? null);
        renderPostPhase22SmokeWrapperParityRemediation(postPhase22SmokeWrapperParityRemediationPayload.latest ?? null);
        renderPostPhase23ExactSmokeWrapperCompatRemediation(postPhase23ExactSmokeWrapperCompatRemediationPayload.latest ?? null);
        renderPostPhase24ExternalApiReadiness(postPhase24ExternalApiReadinessPayload.latest ?? null);
        renderPostPhase25ExternalRestoration(postPhase25ExternalRestorationPayload.latest ?? null);
        renderPostPhase26UbuntuSshRecovery(postPhase26UbuntuSshRecoveryPayload.latest ?? null);
        renderPostPhase27LocalProxyBootstrap(postPhase27LocalProxyBootstrapPayload.latest ?? null);
        renderPostPhase28LocalProxyTransport(postPhase28LocalProxyTransportPayload.latest ?? null);
        renderPostPhase29Shared2Chat409(postPhase29Shared2Chat409Payload.latest ?? null);
        renderPostPhase30Shared2BootstrapRecovery(postPhase30Shared2BootstrapRecoveryPayload.latest ?? null);
        renderPostPhase31AccountSurfaceInventory(postPhase31AccountSurfaceInventoryPayload.latest ?? null);
        renderPostPhase31SelectedCanaryChatRecovery(postPhase31SelectedCanaryChatRecoveryPayload.latest ?? null);
        renderPostPhase32RotatingReadyAccountChatProof(postPhase32RotatingReadyAccountChatProofPayload.latest ?? null);
        renderPostPhase33AccountBrowserIsolation(postPhase33AccountBrowserIsolationPayload.latest ?? null);
        renderPostPhase33IsolatedExternalChatProof(postPhase33IsolatedExternalChatProofPayload.latest ?? null);
        renderPostPhase34ServerIsolatedChatTransfer(postPhase34ServerIsolatedChatTransferPayload.latest ?? null);
        renderPostPhase35ServerTokenSshListenerRecovery(postPhase35ServerTokenSshListenerRecoveryPayload.latest ?? null);
        renderPostPhase36ReverseTunnelChatSmoke(postPhase36ReverseTunnelChatSmokePayload.latest ?? null);
        renderWorkerSummary(summary, workers);
        renderEvents(
          "recent-failures",
          summary.recentFailures,
          "No worker or relay failures have been recorded yet."
        );
        renderEvents(
          "recent-events",
          lifecycleEvents,
          "No lifecycle events have been recorded yet."
        );

        document.getElementById("status-bar").textContent =
          "Last event: " + formatWhen(summary.lastEventAt) + " | Snapshot refreshed " +
          formatWhen(summary.checkedAt);
      }

      async function openBrowser(workerId) {
        const existing = browserAccessByWorker.get(workerId);

        if (existing && activeBrowserAccessStatuses.has(existing.status)) {
          window.open(existing.viewerPath, "_blank", "noopener");
          return;
        }

        const result = await fetchJson("/internal/workers/" + workerId + "/browser-access/start", {
          method: "POST",
          body: JSON.stringify({
            mode: "first_login"
          })
        });

        window.open(result.viewerPath, "_blank", "noopener");
      }

      async function startPool(runtimeMode = "alternate_desktop", browserWindowMode = "Minimized") {
        await fetchJson("/internal/host-pool/start", {
          method: "POST",
          body: JSON.stringify({
            runtimeMode,
            browserWindowMode
          })
        });
      }

      async function stopPool() {
        await fetchJson("/internal/host-pool/stop", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function startReauth(workerId) {
        const result = await fetchJson("/internal/workers/" + workerId + "/reauth/start", {
          method: "POST",
          body: JSON.stringify({})
        });

        window.open(result.viewerPath, "_blank", "noopener");
      }

      async function startManualAuth(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/manual-auth/start", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function startDiagnosticProfile(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/diagnostic-profile/start", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function completeManualAuthAndValidate(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/manual-auth/complete-and-validate", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function completeCompactVisible(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/manual-auth/complete-compact-visible", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function validateRuntime(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/validate-runtime", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function cancelAccess(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/browser-access/cancel", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function completeAccess(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/browser-access/complete", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function markReady(workerId) {
        await fetchJson("/internal/workers/" + workerId + "/mark-ready", {
          method: "POST",
          body: JSON.stringify({})
        });
      }

      async function performAction(workerId, action) {
        pendingAction = workerId;

        try {
          if (action === "open-browser") {
            await openBrowser(workerId);
          } else if (action === "start-reauth") {
            await startReauth(workerId);
          } else if (action === "manual-auth-start" || action === "manual-reauth-start") {
            await startManualAuth(workerId);
          } else if (action === "diagnostic-profile-start") {
            await startDiagnosticProfile(workerId);
          } else if (action === "manual-auth-complete-and-validate") {
            await completeManualAuthAndValidate(workerId);
          } else if (action === "manual-auth-complete-compact-visible") {
            await completeCompactVisible(workerId);
          } else if (action === "validate-runtime") {
            await validateRuntime(workerId);
          } else if (action === "cancel-access") {
            await cancelAccess(workerId);
          } else if (action === "complete-access") {
            await completeAccess(workerId);
          } else if (action === "mark-ready") {
            await markReady(workerId);
          }

          await refresh();
        } finally {
          pendingAction = null;
        }
      }

      async function performPoolAction(action) {
        pendingPoolAction = action;

        try {
          if (action === "start") {
            await startPool("visible_auth", "CompactCorner");
          } else if (action === "start-alternate") {
            await startPool("alternate_desktop", "Minimized");
          } else if (action === "stop") {
            await stopPool();
          }

          await refresh();
        } finally {
          pendingPoolAction = null;
          if (currentHostPool) {
            renderHostPool(currentHostPool);
          }
        }
      }

      async function refresh() {
        try {
          await loadSnapshot();
        } catch (error) {
          document.getElementById("status-bar").textContent =
            "Operator snapshot unavailable";
          document.getElementById("rollout-smoke-copy").textContent =
            "Unable to load the latest rollout smoke.";
          document.getElementById("readiness-recovery-copy").textContent =
            "Unable to load the latest readiness recovery.";
          document.getElementById("post-recovery-regression-copy").textContent =
            "Unable to load the latest post-recovery smoke regression.";
          document.getElementById("zero-ready-root-cause-copy").textContent =
            "Unable to load the latest zero-ready root cause.";
          document.getElementById("disconnected-baseline-remediation-copy").textContent =
            "Unable to load the latest disconnected baseline remediation.";
          document.getElementById("post-remediation-degraded-smoke-copy").textContent =
            "Unable to load the latest post-remediation degraded smoke stabilization.";
          document.getElementById("post-stabilization-runtime-investigation-copy").textContent =
            "Unable to load the latest post-stabilization runtime investigation.";
          document.getElementById("disconnected-runtime-remediation-copy").textContent =
            "Unable to load the latest disconnected runtime remediation.";
          document.getElementById("persistent-disconnected-runtime-followup-copy").textContent =
            "Unable to load the latest persistent disconnected runtime follow-up.";
          document.getElementById("runtime-parity-backport-remediation-copy").textContent =
            "Unable to load the latest runtime parity backport remediation.";
          document.getElementById("post-parity-disconnected-runtime-remediation-copy").textContent =
            "Unable to load the latest post-parity disconnected runtime remediation.";
          document.getElementById("post-phase21-disconnected-runtime-followup-copy").textContent =
            "Unable to load the latest post-phase21 disconnected runtime follow-up.";
          document.getElementById("post-phase22-smoke-wrapper-parity-remediation-copy").textContent =
            "Unable to load the latest post-phase22 smoke-wrapper parity remediation.";
          document.getElementById("post-phase23-exact-smoke-wrapper-compat-remediation-copy").textContent =
            "Unable to load the latest post-phase23 exact smoke-wrapper compat remediation.";
          document.getElementById("post-phase24-external-api-readiness-copy").textContent =
            "Unable to load the latest post-phase24 external API readiness.";
          document.getElementById("post-phase25-external-restoration-copy").textContent =
            "Unable to load the latest post-phase25 external restoration.";
          document.getElementById("post-phase26-ubuntu-ssh-recovery-copy").textContent =
            "Unable to load the latest post-phase26 Ubuntu SSH recovery.";
          document.getElementById("post-phase27-local-proxy-bootstrap-copy").textContent =
            "Unable to load the latest post-phase27 local proxy/bootstrap stabilization.";
          document.getElementById("post-phase28-local-proxy-transport-copy").textContent =
            "Unable to load the latest post-phase28 local proxy transport repair.";
          document.getElementById("post-phase29-shared-2-chat-409-copy").textContent =
            "Unable to load the latest post-phase29 shared-2 chat 409.";
          document.getElementById("post-phase30-shared-2-bootstrap-recovery-copy").textContent =
            "Unable to load the latest post-phase30 shared-2 bootstrap recovery.";
          document.getElementById("post-phase31-account-surface-inventory-copy").textContent =
            "Unable to load the latest post-phase31 local account surface inventory.";
          document.getElementById("post-phase31-selected-canary-chat-recovery-copy").textContent =
            "Unable to load the latest post-phase31 selected canary chat recovery.";
          document.getElementById("post-phase32-rotating-ready-account-chat-proof-copy").textContent =
            "Unable to load the latest post-phase32 rotating ready-account chat proof.";
          document.getElementById("post-phase33-account-browser-isolation-copy").textContent =
            "Unable to load the latest post-phase33 account browser isolation.";
          document.getElementById("post-phase33-isolated-external-chat-proof-copy").textContent =
            "Unable to load the latest post-phase33 isolated external chat proof.";
          document.getElementById("post-phase34-server-isolated-chat-transfer-copy").textContent =
            "Unable to load the latest post-phase34 server isolated external chat proof.";
          document.getElementById("post-phase35-server-token-ssh-listener-recovery-copy").textContent =
            "Unable to load the latest post-phase35 server token SSH listener recovery.";
          document.getElementById("post-phase36-reverse-tunnel-chat-smoke-copy").textContent =
            "Unable to load the latest post-phase36 reverse tunnel chat smoke.";
          document.getElementById("recent-failures").innerHTML =
            '<li class="error">' + escapeHtml(String(error instanceof Error ? error.message : error)) + "</li>";
          document.getElementById("recent-events").innerHTML =
            '<li class="error">Unable to load lifecycle events.</li>';
        }
      }

      document.addEventListener("click", (event) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        const button = target.closest("button[data-action]");

        if (!button) {
          const poolButton = target.closest("button[data-pool-action]");

          if (!poolButton) {
            return;
          }

          const poolAction = poolButton.getAttribute("data-pool-action");

          if (!poolAction) {
            return;
          }

          void performPoolAction(poolAction);
          return;
        }

        const workerId = button.getAttribute("data-worker-id");
        const action = button.getAttribute("data-action");

        if (!workerId || !action) {
          return;
        }

        void performAction(workerId, action);
      });

      void refresh();
      setInterval(refresh, 5000);
    </script>
  </body>
</html>`;
}

export function createInternalAdminPageRouter() {
  const router = Router();

  router.get("/internal/admin", (_request, response) => {
    response.type("html").send(renderInternalAdminPage());
  });

  return router;
}
