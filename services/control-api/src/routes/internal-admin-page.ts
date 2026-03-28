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
          ChatGPT worker pool. This page refreshes itself every 5 seconds and can
          launch a worker viewer through the protected browser access path.
        </p>
        <div class="status-bar" id="status-bar">Loading latest operator snapshot...</div>
      </header>

      <div class="grid">
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

      function severityClass(severity) {
        return severity === "warn" || severity === "error" ? severity : "";
      }

      function formatWhen(value) {
        if (!value) {
          return "no events yet";
        }

        return new Date(value).toLocaleString();
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
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
                <span>Container: \${escapeHtml(worker.containerName)}</span>
                <span>Runtime: \${escapeHtml(worker.runtimeStatus || worker.status.status)}</span>
                <span>Browser access: \${escapeHtml(browserAccessLabel)}</span>
                <span>Last seen: \${escapeHtml(worker.lastSeenAt || "n/a")}</span>
              </div>
              <div class="worker-actions">
                <button data-action="open-browser" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Open browser</button>
                <button class="secondary" data-action="start-reauth" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Start reauth</button>
                \${hasActiveBrowserAccess ? \`<button class="warn" data-action="cancel-access" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Cancel access</button>\` : ""}
                \${hasActiveBrowserAccess ? \`<button class="success" data-action="complete-access" data-worker-id="\${escapeHtml(worker.workerId)}" \${busyForWorker ? "disabled" : ""}>Complete login/reauth</button>\` : ""}
              </div>
            </article>
          \`;
        }).join("");
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
        const [summaryResponse, eventsResponse, workersResponse] = await Promise.all([
          fetch("/internal/observability/summary"),
          fetch("/internal/observability/events?limit=50"),
          fetch("/internal/workers/")
        ]);

        if (!summaryResponse.ok || !eventsResponse.ok || !workersResponse.ok) {
          throw new Error("Internal observability endpoints are unavailable");
        }

        const summary = await summaryResponse.json();
        const events = await eventsResponse.json();
        const workersPayload = await workersResponse.json();
        const workers = workersPayload.workers ?? [];
        const lifecycleEvents = events.filter((event) => lifecycleEventTypes.has(event.eventType));
        const browserAccessResults = await Promise.all(
          workers.map(async (worker) => [worker.workerId, await loadBrowserAccess(worker.workerId)])
        );

        browserAccessByWorker.clear();
        for (const [workerId, browserAccess] of browserAccessResults) {
          browserAccessByWorker.set(workerId, browserAccess);
        }

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

      async function startReauth(workerId) {
        const result = await fetchJson("/internal/workers/" + workerId + "/reauth/start", {
          method: "POST",
          body: JSON.stringify({})
        });

        window.open(result.viewerPath, "_blank", "noopener");
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

      async function performAction(workerId, action) {
        pendingAction = workerId;

        try {
          if (action === "open-browser") {
            await openBrowser(workerId);
          } else if (action === "start-reauth") {
            await startReauth(workerId);
          } else if (action === "cancel-access") {
            await cancelAccess(workerId);
          } else if (action === "complete-access") {
            await completeAccess(workerId);
          }

          await refresh();
        } finally {
          pendingAction = null;
        }
      }

      async function refresh() {
        try {
          await loadSnapshot();
        } catch (error) {
          document.getElementById("status-bar").textContent =
            "Operator snapshot unavailable";
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
