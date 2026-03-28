import type { BrowserContext, Page } from "playwright";

import {
  buildModelLabelPattern,
  modelOptionSelectors,
  modelPickerButtonSelectors,
  newChatSelectors,
  temporaryChatSelectors,
  type BootstrapLocatorCandidate,
  type BootstrapLocatorLike,
  type BootstrapPageLike
} from "./bootstrap-selector-map.js";
import type { WorkerChatBootstrapResult } from "./bootstrap-types.js";

export interface TemporaryChatBootstrapOptions {
  lockKey: string;
  startUrl: string;
  preferredReasoningModelLabels: string[];
}

interface BootstrapBrowserContextLike {
  pages(): BootstrapPageLike[];
  newPage(): Promise<BootstrapPageLike>;
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
  candidates: BootstrapLocatorCandidate[]
): Promise<BootstrapLocatorLike | null> {
  for (const candidate of candidates) {
    const locator = candidate(page);

    if ((await locator.count()) === 0) {
      continue;
    }

    if (await locator.isVisible()) {
      return locator;
    }
  }

  return null;
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

function pageRequiresAuth(page: BootstrapPageLike | null): boolean {
  const currentUrl = page?.url().toLowerCase() ?? "";

  return (
    currentUrl.includes("login") ||
    currentUrl.includes("signin") ||
    currentUrl.includes("auth") ||
    currentUrl.includes("challenge")
  );
}

function buildFailureResult(
  page: BootstrapPageLike | null,
  failureCode: string
): WorkerChatBootstrapResult {
  return {
    status: "failed",
    conversationMode: "unknown",
    modelLabel: null,
    failureCode,
    pageUrl: page?.url() ?? null
  };
}

async function selectPreferredReasoningModel(
  page: BootstrapPageLike,
  preferredReasoningModelLabels: string[]
): Promise<string | null> {
  const picker = await resolveUsableLocator(page, modelPickerButtonSelectors);

  if (!picker) {
    return null;
  }

  await picker.click();

  for (const label of preferredReasoningModelLabels) {
    const labelPattern = buildModelLabelPattern(label);

    for (const candidate of modelOptionSelectors) {
      const locator = candidate(page, labelPattern);

      if ((await locator.count()) === 0) {
        continue;
      }

      if (!(await locator.isVisible())) {
        continue;
      }

      await locator.click();
      return label;
    }
  }

  return null;
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

    if (pageRequiresAuth(page)) {
      return buildFailureResult(page, "bootstrap_auth_required");
    }

    const newChat = await resolveUsableLocator(page, newChatSelectors);

    if (!newChat) {
      return buildFailureResult(page, "bootstrap_selector_not_found");
    }

    await newChat.click();

    const temporaryChat = await resolveUsableLocator(page, temporaryChatSelectors);

    if (!temporaryChat) {
      return buildFailureResult(page, "temporary_chat_unavailable");
    }

    await temporaryChat.click();

    const selectedModel = await selectPreferredReasoningModel(
      page,
      options.preferredReasoningModelLabels
    );

    if (!selectedModel) {
      return buildFailureResult(page, "model_not_available");
    }

    return {
      status: "ready",
      conversationMode: "temporary",
      modelLabel: selectedModel,
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
