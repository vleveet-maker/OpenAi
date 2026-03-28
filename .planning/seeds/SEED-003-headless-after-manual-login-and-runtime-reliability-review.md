---
id: SEED-003
status: dormant
planted: 2026-03-28
planted_during: v1.2 / Phase 10
trigger_when: when a milestone touches browser runtime architecture, hidden worker execution, or recurring ChatGPT auth persistence instability
scope: Large
---

# SEED-003: Headless After Manual Login And Runtime Reliability Review

## Why This Matters

The operator does not want household browser windows opening during routine use. At the same time, manual ChatGPT login or reauthentication still needs a real visible interactive browser because true headless auth is brittle and often blocked.

That creates an explicit two-stage runtime policy:
- visible interactive browser is allowed only for first login or later manual reauthentication
- after that point, routine worker execution should run headless or otherwise non-visible to the operator's desktop session

If saved ChatGPT login still does not survive this visible-login then hidden-runtime split, that is not just an operational inconvenience. It is evidence that the current multi-browser runtime choice is not reliable enough and should be reconsidered at the architecture level instead of being patched indefinitely.

## When to Surface

**Trigger:** when a milestone touches browser runtime architecture, hidden worker execution, or recurring ChatGPT auth persistence instability

This seed should be presented during `$gsd-new-milestone` when the milestone
scope matches any of these conditions:
- we are designing a hidden or headless worker runtime for normal household use
- worker auth or saved ChatGPT session persistence keeps dropping after manual login
- we need to review whether multi-browser host-native workers are still the right long-term runtime

## Scope Estimate

**Large** - likely a full milestone, because it may require a runtime redesign, a new isolation model for hidden workers, and a hard review of whether the current multi-browser strategy remains acceptable.

## Breadcrumbs

Related code and decisions found in the current codebase:

- [PROJECT.md](/d:/OpenAi/.planning/PROJECT.md) - active architecture decisions and newly recorded visible-login then hidden-runtime policy
- [STATE.md](/d:/OpenAi/.planning/STATE.md) - current rollout debt and the remaining `dad` `bootstrap_auth_required` tail
- [ROADMAP.md](/d:/OpenAi/.planning/ROADMAP.md) - current `Phase 10` and `Phase 11` rollout stability context
- [start-host-native-worker.ps1](/d:/OpenAi/infra/host-worker/start-host-native-worker.ps1) - current host-native visible browser launch path
- [browser-launch.ts](/d:/OpenAi/workers/agent/src/browser-launch.ts) - current persistent or CDP browser connection behavior
- [internal-worker-ops.md](/d:/OpenAi/docs/internal-worker-ops.md) - current manual login and reauthentication operator workflow
- [10-VERIFICATION.md](/d:/OpenAi/.planning/phases/10-chatgpt-ui-drift-hardening/10-VERIFICATION.md) - live evidence that `wife` and `shared-1` pass while `dad` still lands in `bootstrap_auth_required`

## Notes

- This seed does not declare that true headless ChatGPT browser automation is already solved.
- The intended invariant is product-facing: no routine visible browser windows on the operator desktop after manual auth is completed.
- If the current multi-browser runtime cannot preserve ChatGPT auth across that hidden-runtime mode, the next step should be an architecture review rather than more local selector or process tweaks.
