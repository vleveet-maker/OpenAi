import type { BrowserContext, Page } from "playwright";

import {
  buildModelOptionTarget,
  composerReadySelectorCandidates,
  modelOptionSelectorCandidates,
  modelPickerButtonSelectorCandidates,
  newChatSelectorCandidates,
  temporaryConfirmationSelectorCandidates,
  temporaryEntrySelectorCandidates,
  temporaryOnboardingContinueSelectorCandidates,
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

interface EnsuredBootstrapPage {
  page: BootstrapPageLike;
  navigationDetail: string;
}

class BootstrapNavigationError extends Error {
  constructor(readonly stepDetail: string) {
    super("bootstrap_navigation_failed");
    this.name = "BootstrapNavigationError";
  }
}

interface ResolvedBootstrapLocator {
  locator: BootstrapLocatorLike;
  selectorId: string;
}

interface ModelSelectionResult {
  selectedModel: string | null;
  failureCode: WorkerChatBootstrapFailureCode | null;
  stepDetail: string | null;
}

const bootstrapLocks = new Map<string, Promise<void>>();
const TRANSIENT_UI_POLL_INTERVAL_MS = 150;
const TEMPORARY_CONFIRMATION_TIMEOUT_MS = 3_000;
const TEMPORARY_ONBOARDING_TIMEOUT_MS = 1_500;
const CHATGPT_URL_PREFIXES = [
  "https://chatgpt.com",
  "https://chat.openai.com"
] as const;
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

async function waitForTemporaryConfirmation(
  page: BootstrapPageLike,
  timeoutMs = TEMPORARY_CONFIRMATION_TIMEOUT_MS
): Promise<ResolvedBootstrapLocator | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const confirmation = await resolveUsableLocator(
      page,
      temporaryConfirmationSelectorCandidates
    );

    if (confirmation) {
      return confirmation;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, TRANSIENT_UI_POLL_INTERVAL_MS);
    });
  }

  return null;
}

function isChatGptUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return CHATGPT_URL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isAuthOrChallengeUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("login") ||
    normalized.includes("signin") ||
    normalized.includes("auth")
  ) {
    return true;
  }

  return detectChallengeMarkers(normalized);
}

function navigationSurfaceUsableForBootstrap(
  page: BootstrapPageLike | null | undefined
): boolean {
  const currentUrl = page?.url().trim() ?? "";

  if (currentUrl.length === 0 || currentUrl.toLowerCase() === "about:blank") {
    return false;
  }

  return isChatGptUrl(currentUrl) || isAuthOrChallengeUrl(currentUrl);
}

async function attemptNavigationBranch(
  page: BootstrapPageLike,
  startUrl: string,
  branchLabel: string
): Promise<EnsuredBootstrapPage | null> {
  try {
    await page.goto(startUrl, {
      waitUntil: "domcontentloaded"
    });
  } catch {
    if (!navigationSurfaceUsableForBootstrap(page)) {
      return null;
    }
  }

  if (!navigationSurfaceUsableForBootstrap(page)) {
    return null;
  }

  return {
    page,
    navigationDetail: branchLabel
  };
}

async function ensureChatPage(
  context: BootstrapBrowserContextLike,
  startUrl: string
): Promise<EnsuredBootstrapPage> {
  const attemptedBranches: string[] = [];
  const reusableChatPage = context
    .pages()
    .find((page) => isChatGptUrl(page.url()));

  if (reusableChatPage) {
    return {
      page: reusableChatPage,
      navigationDetail: "navigation branch: reuse_chatgpt_page"
    };
  }

  const existingPage = context.pages()[0];

  if (existingPage && typeof existingPage.goto === "function") {
    attemptedBranches.push("navigation branch: existing_page_goto");
    const navigatedExistingPage = await attemptNavigationBranch(
      existingPage,
      startUrl,
      "navigation branch: existing_page_goto"
    );

    if (navigatedExistingPage) {
      return navigatedExistingPage;
    }
  }

  const freshPage = await context.newPage();

  if (typeof freshPage.goto === "function") {
    attemptedBranches.push("navigation branch: fresh_page_retry");
    const navigatedFreshPage = await attemptNavigationBranch(
      freshPage,
      startUrl,
      "navigation branch: fresh_page_retry"
    );

    if (navigatedFreshPage) {
      return navigatedFreshPage;
    }
  }

  throw new BootstrapNavigationError(
    attemptedBranches.length > 0
      ? attemptedBranches.join(" -> ")
      : "navigation branch: no_usable_page"
  );
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
  failureCode: WorkerChatBootstrapFailureCode,
  step: WorkerChatBootstrapStep = resolveFailureStep(failureCode),
  stepDetail: string | null = null
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

  return {
    status: "failed",
    conversationMode: "unknown",
    modelLabel: null,
    failureCode,
    step,
    stepDetail,
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
    case "composer_not_ready":
      return "composer_ready";
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
): Promise<{
  failureCode: WorkerChatBootstrapFailureCode | null;
  stepDetail: string | null;
}> {
  const directTemporaryEntry = await resolveUsableLocator(
    page,
    temporaryEntrySelectorCandidates
  );

  if (directTemporaryEntry) {
    await directTemporaryEntry.locator.click();
    return {
      failureCode: null,
      stepDetail: `temporary entry selector: ${directTemporaryEntry.selectorId}`
    };
  }

  const picker = await resolveUsableLocator(page, modelPickerButtonSelectorCandidates);

  if (!picker) {
    return {
      failureCode: "model_picker_not_found",
      stepDetail: "temporary entry fallback model picker not found"
    };
  }

  await picker.locator.click();

  const menuTemporaryEntry = await resolveUsableLocator(
    page,
    temporaryEntrySelectorCandidates
  );

  if (!menuTemporaryEntry) {
    return {
      failureCode: "temporary_entry_not_found",
      stepDetail: "temporary entry menu item not visible after opening model picker"
    };
  }

  await menuTemporaryEntry.locator.click();
  return {
    failureCode: null,
    stepDetail: `temporary entry selector: ${menuTemporaryEntry.selectorId}`
  };
}

async function dismissTemporaryOnboarding(
  page: BootstrapPageLike
): Promise<string | null> {
  const deadline = Date.now() + TEMPORARY_ONBOARDING_TIMEOUT_MS;

  while (Date.now() <= deadline) {
    const continueButton = await resolveUsableLocator(
      page,
      temporaryOnboardingContinueSelectorCandidates
    );

    if (continueButton) {
      await continueButton.locator.click();
      return `temporary onboarding selector: ${continueButton.selectorId}`;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, TRANSIENT_UI_POLL_INTERVAL_MS);
    });
  }

  return null;
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
        failureCode: null,
        stepDetail: `model selector: ${candidate.id} -> ${label}`
      };
    }
  }

  const picker = await resolveUsableLocator(page, modelPickerButtonSelectorCandidates);

  if (!picker) {
    return {
      selectedModel: null,
      failureCode: "model_picker_not_found",
      stepDetail: "model picker was not visible during preferred-model selection"
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
        failureCode: null,
        stepDetail: `model selector: ${candidate.id} -> ${label}`
      };
    }
  }

  return {
    selectedModel: null,
    failureCode: "model_option_not_found",
    stepDetail: "preferred model options were not visible after opening the picker"
  };
}

// Composer readiness is gated on the centralized prompt selectors
// (#prompt-textarea, [data-testid='prompt-textarea'],
// [contenteditable='true'][data-testid*='prompt'],
// textarea[placeholder*='Message'], and [contenteditable='true']).
async function ensureComposerReady(
  page: BootstrapPageLike
): Promise<ResolvedBootstrapLocator | null> {
  return resolveUsableLocator(page, composerReadySelectorCandidates);
}

export async function runTemporaryChatBootstrap(
  context: BootstrapBrowserContextLike,
  options: TemporaryChatBootstrapOptions
): Promise<WorkerChatBootstrapResult> {
  return withBootstrapLock(options.lockKey, async () => {
    let page: BootstrapPageLike | null = null;
    let currentStep: WorkerChatBootstrapStep = "navigation";
    let currentStepDetail: string | null = "loading ChatGPT start surface";
    let navigationDetail: string | null = null;

    try {
      const ensuredPage = await ensureChatPage(context, options.startUrl);
      page = ensuredPage.page;
      navigationDetail = ensuredPage.navigationDetail;
      currentStepDetail = ensuredPage.navigationDetail;
    } catch (error) {
      if (error instanceof BootstrapNavigationError) {
        currentStepDetail = error.stepDetail;
      }

      return buildFailureResult(
        page,
        "bootstrap_navigation_failed",
        currentStep,
        currentStepDetail
      );
    }

    currentStep = "auth_check";
    currentStepDetail = "checking auth state and challenge markers";
    if (await pageShowsChallenge(page)) {
      return buildFailureResult(
        page,
        "bootstrap_challenge_detected",
        currentStep,
        "challenge markers detected before bootstrap could continue"
      );
    }

    if (await pageRequiresAuth(page)) {
      return buildFailureResult(
        page,
        "bootstrap_auth_required",
        currentStep,
        "ChatGPT auth entry is visible for this runtime"
      );
    }

    currentStep = "new_chat";
    currentStepDetail = "opening a fresh chat surface";
    const newChat = await resolveUsableLocator(page, newChatSelectorCandidates);

    if (newChat) {
      await newChat.locator.click();
      currentStepDetail = `new chat selector: ${newChat.selectorId}`;
    } else {
      currentStep = "surface_entry";
      currentStepDetail =
        "new chat selector missing; checking whether current surface can still bootstrap";
      const currentSurfacePicker = await resolveUsableLocator(
        page,
        modelPickerButtonSelectorCandidates
      );

      if (!currentSurfacePicker) {
        return buildFailureResult(
          page,
          "bootstrap_surface_unusable",
          currentStep,
          currentStepDetail
        );
      }
    }

    currentStep = "temporary_entry";
    currentStepDetail = "opening Temporary Chat";
    const temporaryEntry = await openTemporaryEntry(page);

    if (temporaryEntry.failureCode) {
      return buildFailureResult(
        page,
        temporaryEntry.failureCode,
        currentStep,
        temporaryEntry.stepDetail
      );
    }
    currentStepDetail = temporaryEntry.stepDetail;

    currentStep = "temporary_confirmation";
    currentStepDetail = "waiting for Temporary Chat confirmation";
    const temporaryConfirmed = await waitForTemporaryConfirmation(page);

    if (!temporaryConfirmed) {
      return buildFailureResult(
        page,
        "temporary_confirmation_not_found",
        currentStep,
        currentStepDetail
      );
    }
    currentStepDetail = `temporary confirmation selector: ${temporaryConfirmed.selectorId}`;

    currentStep = "temporary_onboarding";
    currentStepDetail = "dismissing Temporary Chat onboarding if present";
    const onboardingDetail = await dismissTemporaryOnboarding(page);

    if (onboardingDetail) {
      currentStepDetail = onboardingDetail;
    }

    currentStep = "model_selection";
    currentStepDetail = "selecting the preferred reasoning model";
    const modelSelection = await selectPreferredReasoningModel(
      page,
      options.preferredReasoningModelLabels
    );

    if (modelSelection.failureCode || !modelSelection.selectedModel) {
      return buildFailureResult(
        page,
        modelSelection.failureCode ?? "model_option_not_found",
        currentStep,
        modelSelection.stepDetail
      );
    }

    currentStep = "composer_ready";
    currentStepDetail = modelSelection.stepDetail;
    const composerLocator = await ensureComposerReady(page);

    if (!composerLocator) {
      return buildFailureResult(
        page,
        "composer_not_ready",
        currentStep,
        "No visible composer matched the centralized prompt-textarea selectors"
      );
    }

    return {
      status: "ready",
      conversationMode: "temporary",
      modelLabel: modelSelection.selectedModel,
      failureCode: null,
      step: "complete",
      stepDetail: navigationDetail
        ? `${navigationDetail}; composer selector: ${composerLocator.selectorId}`
        : `composer selector: ${composerLocator.selectorId}`,
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
