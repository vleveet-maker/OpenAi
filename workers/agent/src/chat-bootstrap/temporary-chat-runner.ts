import type { BrowserContext, Page } from "playwright";

import {
  buildModelLabelPattern,
  modelOptionSelectorCandidates,
  modelPickerButtonSelectorCandidates,
  newChatSelectorCandidates,
  temporaryConfirmationSelectors,
  temporaryEntrySelectorCandidates,
  type BootstrapLocatorCandidate,
  type BootstrapLocatorCandidateDefinition,
  type BootstrapLocatorLike,
  type BootstrapPageLike
} from "./bootstrap-selector-map.js";
import type {
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
    currentUrl.includes("auth") ||
    currentUrl.includes("challenge")
  ) {
    return true;
  }

  if (!page) {
    return false;
  }

  return pageShowsAuthEntry(page);
}

function buildFailureResult(
  page: BootstrapPageLike | null,
  failureCode: WorkerChatBootstrapFailureCode
): WorkerChatBootstrapResult {
  return {
    status: "failed",
    conversationMode: "unknown",
    modelLabel: null,
    failureCode,
    pageUrl: page?.url() ?? null
  };
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

async function selectPreferredReasoningModel(
  page: BootstrapPageLike,
  preferredReasoningModelLabels: string[]
): Promise<ModelSelectionResult> {
  const picker = await resolveUsableLocator(page, modelPickerButtonSelectorCandidates);

  if (!picker) {
    return {
      selectedModel: null,
      failureCode: "model_picker_not_found"
    };
  }

  await picker.locator.click();

  for (const label of preferredReasoningModelLabels) {
    const labelPattern = buildModelLabelPattern(label);

    for (const candidate of modelOptionSelectorCandidates) {
      const locator = candidate.locate(page, labelPattern);

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
        return buildFailureResult(page, "new_chat_selector_not_found");
      }
    }

    const temporaryEntryFailure = await openTemporaryEntry(page);

    if (temporaryEntryFailure) {
      return buildFailureResult(page, temporaryEntryFailure);
    }

    const temporaryConfirmed = await hasTemporaryConfirmation(
      page,
      temporaryConfirmationSelectors
    );

    if (!temporaryConfirmed) {
      return buildFailureResult(page, "temporary_confirmation_not_found");
    }

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
