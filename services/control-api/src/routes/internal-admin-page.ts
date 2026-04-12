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
        const [poolResponse, summaryResponse, eventsResponse, workersResponse, rolloutSmokeResponse, readinessRecoveryResponse, postRecoveryRegressionResponse, zeroReadyRootCauseResponse, disconnectedBaselineRemediationResponse, postRemediationDegradedSmokeResponse, postStabilizationRuntimeInvestigationResponse, disconnectedRuntimeRemediationResponse, persistentDisconnectedRuntimeFollowupResponse, runtimeParityBackportRemediationResponse, postParityDisconnectedRuntimeRemediationResponse, postPhase21DisconnectedRuntimeFollowupResponse, postPhase22SmokeWrapperParityRemediationResponse, postPhase23ExactSmokeWrapperCompatRemediationResponse, postPhase24ExternalApiReadinessResponse, postPhase25ExternalRestorationResponse, postPhase26UbuntuSshRecoveryResponse] = await Promise.all([
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
          fetch("/internal/post-phase26-ubuntu-ssh-recovery/latest")
        ]);

        if (!poolResponse.ok || !summaryResponse.ok || !eventsResponse.ok || !workersResponse.ok || !rolloutSmokeResponse.ok || !readinessRecoveryResponse.ok || !postRecoveryRegressionResponse.ok || !zeroReadyRootCauseResponse.ok || !disconnectedBaselineRemediationResponse.ok || !postRemediationDegradedSmokeResponse.ok || !postStabilizationRuntimeInvestigationResponse.ok || !disconnectedRuntimeRemediationResponse.ok || !persistentDisconnectedRuntimeFollowupResponse.ok || !runtimeParityBackportRemediationResponse.ok || !postParityDisconnectedRuntimeRemediationResponse.ok || !postPhase21DisconnectedRuntimeFollowupResponse.ok || !postPhase22SmokeWrapperParityRemediationResponse.ok || !postPhase23ExactSmokeWrapperCompatRemediationResponse.ok || !postPhase24ExternalApiReadinessResponse.ok || !postPhase25ExternalRestorationResponse.ok || !postPhase26UbuntuSshRecoveryResponse.ok) {
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
