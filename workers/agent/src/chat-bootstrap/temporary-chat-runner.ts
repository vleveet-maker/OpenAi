import type { BrowserContext, Page } from "playwright";

import {
  buildModelOptionTarget,
  modelOptionSelectorCandidates,
  modelPickerButtonSelectorCandidates,
  newChatSelectorCandidates,
  temporaryConfirmationSelectors,
  temporaryEntrySelectorCandidates,
  temporaryOnboardingContinueSelectorCandidates,
  type BootstrapLocatorCandidate,
  type BootstrapLocatorCandidateDefinition,
  type BootstrapLocatorLike,
  type BootstrapPageLike
} from "./bootstrap-selector-map.js";
import type {
  WorkerChatBootstrapStep,
  WorkerChatBootstrapFailureCode,
  WorkerChatBootstrapResult
} from "./bootstrap-types.js";

export interface TemporaryChatBootstrapOptions {
  lockKey: string;
  startUrl: string;
  preferredReasoningModelLabels: string[];
}

interface BootstrapBrowserContextLike {
  pages(): BootstrapPageLike[];
  newPage(): Promise<BootstrapPageLike>;
}

interface ResolvedBootstrapLocator {
  locator: BootstrapLocatorLike;
  selectorId: string;
}

interface ModelSelectionResult {
  selectedModel: string | null;
  failureCode: WorkerChatBootstrapFailureCode | null;
}

const bootstrapLocks = new Map<string, Promise<void>>();
const TRANSIENT_UI_POLL_INTERVAL_MS = 150;
const TEMPORARY_CONFIRMATION_TIMEOUT_MS = 3_000;
const TEMPORARY_ONBOARDING_TIMEOUT_MS = 1_500;
const CHALLENGE_MARKERS = [
  "__cf_chl_rt_tk",
  "cf_challenge",
  "cloudflare",
  "verify you are human",
  "just a moment",
  "challenge"
];

async function withBootstrapLock<T>(
  lockKey: string,
  operation: () => Promise<T>
): Promise<T> {
  while (bootstrapLocks.has(lockKey)) {
    await bootstrapLocks.get(lockKey);
  }

  let release!: () => void;
  const activeLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  bootstrapLocks.set(lockKey, activeLock);

  try {
    return await operation();
  } finally {
    bootstrapLocks.delete(lockKey);
    release();
  }
}

async function resolveUsableLocator(
  page: BootstrapPageLike,
  candidates: BootstrapLocatorCandidateDefinition[]
): Promise<ResolvedBootstrapLocator | null> {
  for (const candidate of candidates) {
    const locator = candidate.locate(page);

    if ((await locator.count()) === 0) {
      continue;
    }

    if (await locator.isVisible()) {
      return {
        locator,
        selectorId: candidate.id
      };
    }
  }

  return null;
}

async function hasTemporaryConfirmation(
  page: BootstrapPageLike,
  candidates: BootstrapLocatorCandidate[]
): Promise<boolean> {
  for (const candidate of candidates) {
    const locator = candidate(page);

    if ((await locator.count()) === 0) {
      continue;
    }

    if (await locator.isVisible()) {
      return true;
    }
  }

  return false;
}

async function waitForTemporaryConfirmation(
  page: BootstrapPageLike,
  timeoutMs = TEMPORARY_CONFIRMATION_TIMEOUT_MS
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    if (await hasTemporaryConfirmation(page, temporaryConfirmationSelectors)) {
      return true;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, TRANSIENT_UI_POLL_INTERVAL_MS);
    });
  }

  return false;
}

async function ensureChatPage(
  context: BootstrapBrowserContextLike,
  startUrl: string
): Promise<BootstrapPageLike> {
  const existingPage = context.pages()[0];

  if (existingPage && typeof existingPage.goto === "function") {
    await existingPage.goto(startUrl, {
      waitUntil: "domcontentloaded"
    });
    return existingPage;
  }

  const page = existingPage ?? (await context.newPage());

  if (typeof page.goto === "function") {
    await page.goto(startUrl, {
      waitUntil: "domcontentloaded"
    });
  }

  return page;
}

async function pageShowsAuthEntry(page: BootstrapPageLike): Promise<boolean> {
  for (const selector of [
    "[data-testid='login-button']",
    "[data-testid='signup-button']",
    "button[data-testid='login-button']",
    "button[data-testid='signup-button']"
  ]) {
    const locator = page.locator(selector).last();

    if ((await locator.count()) === 0) {
      continue;
    }

    if (await locator.isVisible()) {
      return true;
    }
  }

  return false;
}

async function pageRequiresAuth(page: BootstrapPageLike | null): Promise<boolean> {
  const currentUrl = page?.url().toLowerCase() ?? "";

  if (
    currentUrl.includes("login") ||
    currentUrl.includes("signin") ||
    currentUrl.includes("auth")
  ) {
    return true;
  }

  if (!page) {
    return false;
  }

  return pageShowsAuthEntry(page);
}

async function getPageTitle(page: BootstrapPageLike | null): Promise<string | null> {
  if (!page || typeof page.title !== "function") {
    return null;
  }

  try {
    return await page.title();
  } catch {
    return null;
  }
}

function detectChallengeMarkers(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => normalized.includes(marker));
}

async function pageShowsChallenge(page: BootstrapPageLike | null): Promise<boolean> {
  if (!page) {
    return false;
  }

  return (
    detectChallengeMarkers(page.url()) ||
    detectChallengeMarkers(await getPageTitle(page))
  );
}

async function buildFailureResult(
  page: BootstrapPageLike | null,
  failureCode: WorkerChatBootstrapFailureCode
): Promise<WorkerChatBootstrapResult> {
  const challengeDetected =
    failureCode === "bootstrap_challenge_detected" ||
    (await pageShowsChallenge(page));

  const runtimeUsability =
    failureCode === "bootstrap_auth_required"
      ? "auth_required"
      : challengeDetected
        ? "challenge_blocked"
        : "surface_unusable";

  const step = resolveFailureStep(failureCode);

  return {
    status: "failed",
    conversationMode: "unknown",
    modelLabel: null,
    failureCode,
    step,
    stepDetail: null,
    composerReady: false,
    challengeDetected,
    pageTitle: await getPageTitle(page),
    runtimeUsability,
    pageUrl: page?.url() ?? null
  };
}

function resolveFailureStep(
  failureCode: WorkerChatBootstrapFailureCode
): WorkerChatBootstrapStep {
  switch (failureCode) {
    case "bootstrap_navigation_failed":
      return "navigation";
    case "bootstrap_auth_required":
    case "bootstrap_challenge_detected":
      return "auth_check";
    case "bootstrap_surface_unusable":
      return "surface_entry";
    case "new_chat_selector_not_found":
      return "new_chat";
    case "temporary_chat_unavailable":
    case "temporary_entry_not_found":
      return "temporary_entry";
    case "temporary_confirmation_not_found":
      return "temporary_confirmation";
    case "model_not_available":
    case "model_picker_not_found":
    case "model_option_not_found":
    case "bootstrap_selector_not_found":
      return "model_selection";
    default:
      return "surface_entry";
  }
}

async function openTemporaryEntry(
  page: BootstrapPageLike
): Promise<WorkerChatBootstrapFailureCode | null> {
  const directTemporaryEntry = await resolveUsableLocator(
    page,
    temporaryEntrySelectorCandidates
  );

  if (directTemporaryEntry) {
    await directTemporaryEntry.locator.click();
    return null;
  }

  const picker = await resolveUsableLocator(page, modelPickerButtonSelectorCandidates);

  if (!picker) {
    return "model_picker_not_found";
  }

  await picker.locator.click();

  const menuTemporaryEntry = await resolveUsableLocator(
    page,
    temporaryEntrySelectorCandidates
  );

  if (!menuTemporaryEntry) {
    return "temporary_entry_not_found";
  }

  await menuTemporaryEntry.locator.click();
  return null;
}

async function dismissTemporaryOnboarding(page: BootstrapPageLike): Promise<void> {
  const deadline = Date.now() + TEMPORARY_ONBOARDING_TIMEOUT_MS;

  while (Date.now() <= deadline) {
    const continueButton = await resolveUsableLocator(
      page,
      temporaryOnboardingContinueSelectorCandidates
    );

    if (continueButton) {
      await continueButton.locator.click();
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, TRANSIENT_UI_POLL_INTERVAL_MS);
    });
  }
}

async function selectPreferredReasoningModel(
  page: BootstrapPageLike,
  preferredReasoningModelLabels: string[]
): Promise<ModelSelectionResult> {
  for (const label of preferredReasoningModelLabels) {
    for (const candidate of modelOptionSelectorCandidates) {
      const locator = candidate.locate(page, buildModelOptionTarget(label));

      if ((await locator.count()) === 0) {
        continue;
      }

      if (!(await locator.isVisible())) {
        continue;
      }

      await locator.click();
      return {
        selectedModel: label,
        failureCode: null
      };
    }
  }

  const picker = await resolveUsableLocator(page, modelPickerButtonSelectorCandidates);

  if (!picker) {
    return {
      selectedModel: null,
      failureCode: "model_picker_not_found"
    };
  }

  await picker.locator.click();

  for (const label of preferredReasoningModelLabels) {
    for (const candidate of modelOptionSelectorCandidates) {
      const locator = candidate.locate(page, buildModelOptionTarget(label));

      if ((await locator.count()) === 0) {
        continue;
      }

      if (!(await locator.isVisible())) {
        continue;
      }

      await locator.click();
      return {
        selectedModel: label,
        failureCode: null
      };
    }
  }

  return {
    selectedModel: null,
    failureCode: "model_option_not_found"
  };
}

export async function runTemporaryChatBootstrap(
  context: BootstrapBrowserContextLike,
  options: TemporaryChatBootstrapOptions
): Promise<WorkerChatBootstrapResult> {
  return withBootstrapLock(options.lockKey, async () => {
    let page: BootstrapPageLike | null = null;

    try {
      page = await ensureChatPage(context, options.startUrl);
    } catch {
      return buildFailureResult(page, "bootstrap_navigation_failed");
    }

    if (await pageShowsChallenge(page)) {
      return buildFailureResult(page, "bootstrap_challenge_detected");
    }

    if (await pageRequiresAuth(page)) {
      return buildFailureResult(page, "bootstrap_auth_required");
    }

    const newChat = await resolveUsableLocator(page, newChatSelectorCandidates);

    if (newChat) {
      await newChat.locator.click();
    } else {
      const currentSurfacePicker = await resolveUsableLocator(
        page,
        modelPickerButtonSelectorCandidates
      );

      if (!currentSurfacePicker) {
        return buildFailureResult(page, "bootstrap_surface_unusable");
      }
    }

    const temporaryEntryFailure = await openTemporaryEntry(page);

    if (temporaryEntryFailure) {
      return buildFailureResult(page, temporaryEntryFailure);
    }

    const temporaryConfirmed = await waitForTemporaryConfirmation(page);

    if (!temporaryConfirmed) {
      return buildFailureResult(page, "temporary_confirmation_not_found");
    }

    await dismissTemporaryOnboarding(page);

    const modelSelection = await selectPreferredReasoningModel(
      page,
      options.preferredReasoningModelLabels
    );

    if (modelSelection.failureCode || !modelSelection.selectedModel) {
      return buildFailureResult(
        page,
        modelSelection.failureCode ?? "model_option_not_found"
      );
    }

    return {
      status: "ready",
      conversationMode: "temporary",
      modelLabel: modelSelection.selectedModel,
      failureCode: null,
      step: "complete",
      stepDetail: null,
      composerReady: true,
      challengeDetected: false,
      pageTitle: await getPageTitle(page),
      runtimeUsability: "usable",
      pageUrl: page.url()
    };
  });
}

export function toBootstrapBrowserContext(
  browserContext: BrowserContext
): BootstrapBrowserContextLike {
  return browserContext as unknown as BootstrapBrowserContextLike;
}

export function toBootstrapPage(page: Page): BootstrapPageLike {
  return page as unknown as BootstrapPageLike;
}
