# Phase 32: Bounded Canary External Chat Recovery (dad) - Research

**Researched:** 2026-04-14  
**Domain:** Local Windows bounded canary runtime + external chat recovery  
**Confidence:** MEDIUM

## Summary

Phase 31.1’s preserve-first inventory (2026-04-14) shows `dad` is the honest bounded canary and `shared-2` is `needs_login`. Continuing to target `shared-2` would be knowingly misaligned with the verified local pool state, so Phase 32 must pivot to the selected canary to regain external chat as fast as possible without violating preserve-first.

Phase 32 should be reframed around a bounded canary (`dad`) external chat recovery flow that captures host-controller vs internal worker registry truth for the selected canary, runs the public `/healthz`, `/v1/models`, and `/v1/chat/completions` in the same tracked flow when safe, and records one final verdict. `shared-2` becomes explicitly deferred debt until a later login-recovery phase.

**Primary recommendation:** Reframe Phase 32 around the selected canary (`dad`) and update WRDR-01..04 to target the selected canary instead of `shared-2`.

## User Constraints

- Preserve-first is mandatory: no profile deletion, no cookie/localStorage clearing, no blind full-pool restart, no mass relogin.
- Local-machine proof-before-transfer only; no Windows Server execution.
- `dad` is the selected honest bounded canary.
- `shared-2` is `needs_login` and must be treated as deferred debt, not the active proof target.
- Prioritize externally usable chat recovery over continued single-account debugging.

## Phase 32 Reframe

**Proposed phase name:** Bounded canary (dad) worker-registry truth capture and external chat recovery.  
**Scope:** Replace the `shared-2`-specific focus with a selected-canary flow that proves external chat readiness or records the exact blocker for `dad`, while explicitly deferring `shared-2`.

## WRDR Rewrite (Recommended)

| ID | Proposed wording |
|----|------------------|
| WRDR-01 | The project can produce one durable artifact that explains the bounded selected-canary (`dad`) runtime truth across host-controller truth, internal worker-registry truth, listener/CDP truth, and direct browser evidence instead of collapsing the blocker into another generic bootstrap failure. |
| WRDR-02 | One bounded preserve-first local worker flow can either reconcile the selected canary (`dad`) into externally usable chat or honestly record the exact remaining mismatch without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin. |
| WRDR-03 | The latest Phase 32 selected-canary reconciliation result is visible through an internal operator surface or durable file-backed artifact before any new external-readiness claim. |
| WRDR-04 | The phase ends with one tracked final verdict `externally_ready` or `hold_rollout`, and if a public chat rerun is still unsafe, the artifact records the exact blocked reason in the same flow instead of pretending the run was inconclusive. |

## Recommended Plan Split (3 Waves)

1. **Wave 1: Selected-canary reconciliation wrapper + diagnostics**  
   Update the Phase 32 wrapper to target the selected canary (`dad`) and capture host-controller truth, internal registry truth, listener/CDP truth, and browser evidence in one artifact. If the script name is still `reconcile-shared-2-worker-registry-drift-and-recover-chat.ps1`, rename to a canary-agnostic name and accept an explicit `-WorkerId`. Update worker-health diagnostics so the classification is canary-agnostic. Add/adjust focused tests.

2. **Wave 2: Latest-state route + `/internal/admin` visibility**  
   Add or update a Phase 32 latest-state route (file-backed) and the matching `/internal/admin` section that reads the new artifact and renders the selected-canary truth. Keep the route and admin IDs aligned with the Phase 32 artifact name. Add focused route/admin tests.

3. **Wave 3: Live bounded proof + external chat rerun**  
   Run the bounded preserve-first flow on `dad`. If the runtime becomes explicitly usable, rerun authenticated public `/healthz`, `/v1/models`, and `/v1/chat/completions` through `77.66.186.75` in the same tracked flow. Write the final artifact and verification. If blocked, record the exact reason and stop without touching `shared-2`.

## Shared-2 Deferred Debt (Explicit)

- No `shared-2` login recovery or manual reauthentication in Phase 32.
- No `shared-2` worker-registry reconciliation attempts in Phase 32.
- No `shared-2` bootstrap or CDP recovery debugging in Phase 32.
- No `shared-2` external chat reruns in Phase 32.
- Record `shared-2` as `needs_login` debt with a pointer to the Phase 31.1 inventory artifact.

## Phase 32 Success Criteria (Updated)

- The bounded canary is `dad`, as selected by the 2026-04-14 inventory artifact.
- A single durable Phase 32 artifact captures host-controller truth, internal registry truth, listener/CDP truth, and browser evidence for `dad`.
- Preserve-first constraints are honored with no profile deletion, no cookie/localStorage clearing, no mass restart, and no mass relogin.
- If the canary becomes usable, authenticated public `/healthz`, `/v1/models`, and `/v1/chat/completions` all pass in the same tracked flow.
- If the canary remains blocked, the artifact records the exact blocker and ends with `hold_rollout`.
- The latest result is visible via a file-backed latest route and `/internal/admin`.
- `shared-2` is explicitly deferred and not used as a proof target.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PowerShell | 5.1.26100.7920 | Bounded wrapper execution | Existing infra scripts are PowerShell-first |
| Node.js | 24.14.0 | Control API runtime | Existing control-api runtime |
| Express | 4.21.2 (project-pinned) | HTTP routing | Current control-api server stack |
| better-sqlite3 | 12.8.0 (project-pinned) | Local state persistence | Existing control-api dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.8.2 (project-pinned) | Build + types | Control-api source changes |
| Vitest | 4.1.2 (project-pinned) | Unit tests | Route/diagnostic tests |
| tsx | 4.19.3 (project-pinned) | Dev runtime | Local dev runs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bounded `shared-2` focus | Selected-canary (`dad`) focus | Defers `shared-2` login recovery but restores external chat faster |

**Installation:**
```bash
npm.cmd --prefix services/control-api install
```

**Version verification (registry latest, not applied in this phase):**
- express 5.2.1 (2025-12-01)
- better-sqlite3 12.9.0 (2026-04-12)
- vitest 4.1.4 (2026-04-09)
- typescript 6.0.2 (2026-03-23)

## Architecture Patterns

### Recommended Project Structure
```
infra/windows-block/                          # PowerShell bounded wrappers
infra/data/post-phase32-*/latest.json         # file-backed latest artifact
services/control-api/src/routes/              # internal routes
services/control-api/src/routes/internal-admin-page.ts
.planning/phases/32-*/                        # durable Phase 32 artifacts
```

### Pattern 1: File-Backed Latest Route
**What:** A dedicated internal route reads a file-backed latest artifact and returns `{ latest }`.  
**When to use:** Exposing Phase 32 results through the operator surface.  
**Example:**
```typescript
// Source: services/control-api/src/routes/internal-post-phase31-account-surface-inventory.ts
router.get(
  "/internal/post-phase31-account-surface-inventory/latest",
  (_request, response) => {
    const statePath = options.statePath;

    if (!statePath || !existsSync(statePath)) {
      response.json({ latest: null });
      return;
    }

    const latest = readLatestState(statePath);
    response.json({ latest });
  }
);
```

### Anti-Patterns to Avoid
- **Continuing to target `shared-2`**: It is `needs_login`, so it is not the honest canary and slows external chat recovery.
- **Claiming external readiness without `/v1/chat/completions`**: `/healthz` + `/v1/models` alone is not sufficient.
- **Preserve-first violations**: Any cookie/localStorage clearing, profile deletion, or mass relogin invalidates the phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Latest-state parsing | Custom JSON parsing per route | `readLatestState` helper | Consistent BOM handling and error surfacing |
| Operator surface rendering | New HTML blocks from scratch | Existing `/internal/admin` pattern | Keeps operator surface consistent |
| Canary selection logic | Ad-hoc manual choice | Phase 31.1 inventory artifact | Keeps canary selection honest and documented |

**Key insight:** Phase 32 needs reuse of proven operator-surface and artifact patterns, not new tooling.

## Common Pitfalls

### Pitfall 1: Canary Drift
**What goes wrong:** The phase keeps targeting `shared-2` despite the inventory marking it `needs_login`.  
**Why it happens:** Old plans and scripts still hardcode `shared-2`.  
**How to avoid:** Parameterize the canary and default to `dad` from the latest inventory artifact.  
**Warning signs:** Any Phase 32 script still contains `shared-2` as the only worker ID.

### Pitfall 2: Partial External Proof
**What goes wrong:** `/healthz` and `/v1/models` pass, but `/v1/chat/completions` is skipped or run later.  
**Why it happens:** Shortening the run to avoid the unstable step.  
**How to avoid:** Only claim `externally_ready` when all three endpoints pass in the same tracked flow.  
**Warning signs:** Artifacts mention "ready" without a `/v1/chat/completions` result.

### Pitfall 3: Preserve-First Regression
**What goes wrong:** A “quick fix” clears cookies or restarts the full pool.  
**Why it happens:** Frustration with a single blocked account.  
**How to avoid:** Keep all actions bounded to the selected canary and preserve-first guardrails.  
**Warning signs:** Any use of profile deletion, cookie/localStorage clearing, or pool-wide actions.

## Code Examples

### Latest-Route Pattern
```typescript
// Source: services/control-api/src/routes/internal-post-phase31-account-surface-inventory.ts
if (!statePath || !existsSync(statePath)) {
  response.json({ latest: null });
  return;
}

const latest = readLatestState(statePath);
response.json({ latest });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat `shared-2` as default canary | Use `dad` as selected canary | 2026-04-14 (Phase 31.1) | Removes false focus and enables faster external chat recovery |
| Deep-dive `shared-2` registry drift | Capture registry truth on selected canary | 2026-04-14 | Keeps diagnostics but aligns to honest pool state |

**Deprecated/outdated:**
- `shared-2` as active proof target: superseded by the 2026-04-14 inventory.

## Open Questions

1. **Does `dad` exhibit any worker-registry mismatch at all?**
   - What we know: `dad` is `ready` and acceptable as the next canary.
   - What's unclear: Whether host-controller vs internal registry diverges for `dad`.
   - Recommendation: Capture both truths in the Phase 32 artifact before assuming a registry fix is needed.

2. **Where is the valid bearer token at run time?**
   - What we know: External smoke may need the Ubuntu host token.
   - What's unclear: Whether the current Windows host has a valid bearer token.
   - Recommendation: Run external smoke from the host with the live token while still targeting `77.66.186.75`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PowerShell | Wrapper execution | ✓ | 5.1.26100.7920 | — |
| Node.js | Control API + tests | ✓ | v24.14.0 | — |
| npm.cmd | Test/build commands | ✓ | v24.14.0 (bundled) | Use `npm.cmd` since `npm` alias is missing |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- `npm` alias missing; use `npm.cmd` explicitly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest |
| Config file | `services/control-api/vitest.config.ts` |
| Quick run command | `npm.cmd --prefix services/control-api test -- worker-health-monitor.test.ts public-chat.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` and `npm.cmd --prefix services/control-api run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRDR-01 | Selected-canary artifact captures host-controller vs registry vs CDP truth | parser + unit | `powershell -NoProfile -Command "$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('infra\\windows-block\\reconcile-bounded-canary-worker-registry-drift-and-recover-chat.ps1',[ref]$t,[ref]$e); if($e.Count -gt 0){$e | % ToString; exit 1}"` and `npm.cmd --prefix services/control-api test -- worker-health-monitor.test.ts` | ❌ Wave 0 |
| WRDR-02 | Preserve-first canary flow attempts reconciliation or records exact blocker | unit + manual | `npm.cmd --prefix services/control-api test -- public-chat.test.ts` | ✅ |
| WRDR-03 | Latest route and admin visibility | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase32-canary-recovery.test.ts internal-admin-page.test.ts` | ❌ Wave 0 |
| WRDR-04 | Final verdict and public rerun in same flow | manual + artifact | `powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\reconcile-bounded-canary-worker-registry-drift-and-recover-chat.ps1` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm.cmd --prefix services/control-api test -- worker-health-monitor.test.ts public-chat.test.ts`
- **Per wave merge:** `npm.cmd --prefix services/control-api test`
- **Phase gate:** `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build`

### Wave 0 Gaps
- [ ] `infra/windows-block/reconcile-bounded-canary-worker-registry-drift-and-recover-chat.ps1` — new or renamed wrapper
- [ ] `services/control-api/test/internal-post-phase32-canary-recovery.test.ts` — latest route coverage

## Sources

### Primary (HIGH confidence)
- `.planning/STATE.md` — Phase 31.1 completion and canary reselection
- `.planning/phases/31.1-full-local-account-surface-inventory-and-bounded-canary-reselection-before-worker-registry-drift-reconciliation/31.1-ACCOUNT-INVENTORY-SUMMARY.json` — inventory truth and selected canary
- `.planning/phases/31.1-full-local-account-surface-inventory-and-bounded-canary-reselection-before-worker-registry-drift-reconciliation/31.1-VERIFICATION.md` — verification outcomes
- `.planning/REQUIREMENTS.md` — WRDR-01..04 original wording
- `services/control-api/src/routes/internal-post-phase31-account-surface-inventory.ts` — latest-route pattern
- `services/control-api/src/routes/read-latest-state.ts` — latest-state helper
- `services/control-api/package.json` — pinned dependency versions
- `services/control-api/vitest.config.ts` — test framework config

### Secondary (MEDIUM confidence)
- NPM registry metadata via `npm.cmd view` for version verification

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — versions verified, but phase does not upgrade dependencies.
- Architecture: HIGH — based on current repo patterns and Phase 31.1 artifacts.
- Pitfalls: HIGH — derived from recent phase outcomes and explicit constraints.

**Research date:** 2026-04-14  
**Valid until:** 2026-04-21

## Planner Handoff (Concise)

- Reframe Phase 32 around selected canary `dad`; `shared-2` is explicit deferred debt.
- Rewrite WRDR-01..04 to refer to selected canary (`dad`) and preserve-first external chat proof.
- 3 waves: (1) canary-agnostic wrapper + diagnostics, (2) latest route + admin surface, (3) live bounded proof + public chat rerun and final artifact.
- Success criteria: preserve-first honored, canary `dad` proof captured, `/healthz` + `/v1/models` + `/v1/chat/completions` pass together or exact blocker recorded, latest route/admin updated.
