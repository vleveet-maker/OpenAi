import type { BrowserContext, Page } from "playwright";

import {
  assistantTurnSelectorCandidates,
  composerSelectorCandidates,
  generatingIndicatorSelectorCandidates,
  sendButtonSelectorCandidates,
  type RelayLocatorCandidateDefinition,
  type RelayLocatorLike,
  type RelayPageLike
} from "./selector-map.js";
import type {
  WorkerRelayFailureCode,
  WorkerRelayRequest,
  WorkerRelayResult
} from "./relay-types.js";

interface RelayBrowserContextLike {
  pages(): RelayPageLike[];
  newPage(): Promise<RelayPageLike>;
}

export interface RelayRunnerOptions {
  lockKey: string;
  startUrl?: string;
  relayTimeoutMs?: number;
  quiescenceMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  delay?: (ms: number) => Promise<void>;
}

interface AssistantSnapshot {
  count: number;
  text: string;
  selectorId: string | null;
}

const relayLocks = new Map<string, Promise<void>>();

async function withRelayLock<T>(
  lockKey: string,
  operation: () => Promise<T>
): Promise<T> {
  while (relayLocks.has(lockKey)) {
    await relayLocks.get(lockKey);
  }

  let release!: () => void;
  const activeLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  relayLocks.set(lockKey, activeLock);

  try {
    return await operation();
  } finally {
    relayLocks.delete(lockKey);
    release();
  }
}

async function resolveUsableLocator(
  page: RelayPageLike,
  candidates: RelayLocatorCandidateDefinition[]
): Promise<{
  locator: RelayLocatorLike;
  selectorId: string;
} | null> {
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

async function readAssistantSnapshot(
  page: RelayPageLike
): Promise<AssistantSnapshot> {
  for (const candidate of assistantTurnSelectorCandidates) {
    const locator = candidate.locate(page);
    const count = await locator.count();

    if (count === 0) {
      continue;
    }

    const latestText = (await locator.last().innerText()).trim();

    return {
      count,
      text: latestText,
      selectorId: candidate.id
    };
  }

  return {
    count: 0,
    text: "",
    selectorId: null
  };
}

async function hasGeneratingIndicator(page: RelayPageLike): Promise<boolean> {
  for (const candidate of generatingIndicatorSelectorCandidates) {
    const locator = candidate.locate(page);

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
  context: RelayBrowserContextLike,
  startUrl?: string
): Promise<RelayPageLike> {
  const existingPage = context.pages()[0];

  if (existingPage) {
    return existingPage;
  }

  const page = await context.newPage();

  if (startUrl && typeof page.goto === "function") {
    await page.goto(startUrl, {
      waitUntil: "domcontentloaded"
    });
  }

  return page;
}

async function pageShowsAuthEntry(page: RelayPageLike): Promise<boolean> {
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

async function pageRequiresAuth(page: RelayPageLike | null): Promise<boolean> {
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
  page: RelayPageLike | null,
  failureCode: WorkerRelayFailureCode,
  failureClass: WorkerRelayResult["failureClass"],
  failureStage: WorkerRelayResult["failureStage"],
  submittedAt: string | null
): WorkerRelayResult {
  return {
    assistantText: null,
    completedAt: new Date().toISOString(),
    pageUrl: page?.url() ?? null,
    failureCode,
    failureClass,
    failureStage,
    submittedAt
  };
}

export async function runRelay(
  context: RelayBrowserContextLike,
  request: WorkerRelayRequest,
  options: RelayRunnerOptions
): Promise<WorkerRelayResult> {
  const relayTimeoutMs = options.relayTimeoutMs ?? 120_000;
  const quiescenceMs = options.quiescenceMs ?? 1_500;
  const pollIntervalMs = options.pollIntervalMs ?? 250;
  const now = options.now ?? (() => Date.now());
  const delay =
    options.delay ??
    ((ms: number) => new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }));

  return withRelayLock(options.lockKey, async () => {
    const page = await ensureChatPage(context, options.startUrl);
    const authRequired = await pageRequiresAuth(page);
    const baselineAssistantSnapshot = await readAssistantSnapshot(page);
    const composer = await resolveUsableLocator(page, composerSelectorCandidates);

    if (!composer) {
      return buildFailureResult(
        page,
        "composer_selector_not_found",
        authRequired ? "auth" : "transient",
        "dispatch",
        null
      );
    }

    try {
      await composer.locator.fill(request.bodyText);
      const sendButton = await resolveUsableLocator(
        page,
        sendButtonSelectorCandidates
      );

      if (sendButton) {
        await sendButton.locator.click();
      } else {
        try {
          await composer.locator.press("Enter");
        } catch {
          return buildFailureResult(
            page,
            "send_button_selector_not_found",
            authRequired ? "auth" : "transient",
            "dispatch",
            null
          );
        }
      }
    } catch {
      return buildFailureResult(
        page,
        "submit_failed",
        authRequired ? "auth" : "transient",
        "dispatch",
        null
      );
    }

    const submittedAt = new Date().toISOString();
    const startedAt = now();
    let lastObservedText = "";
    let stabilizedAt: number | null = null;
    let assistantObserved = false;
    let assistantSelectorDetected =
      baselineAssistantSnapshot.selectorId !== null;

    while (now() - startedAt <= relayTimeoutMs) {
      let assistantSnapshot: AssistantSnapshot;

      try {
        assistantSnapshot = await readAssistantSnapshot(page);
      } catch {
        return buildFailureResult(
          page,
          "capture_failed",
          "fatal",
          assistantObserved ? "capture" : "submitted",
          submittedAt
        );
      }

      if (assistantSnapshot.selectorId) {
        assistantSelectorDetected = true;
      }

      const hasNewAssistantTurn =
        assistantSnapshot.count > baselineAssistantSnapshot.count;
      const hasChangedAssistantText =
        assistantSnapshot.text.length > 0 &&
        assistantSnapshot.text !== baselineAssistantSnapshot.text;

      if (hasNewAssistantTurn || hasChangedAssistantText) {
        assistantObserved = true;

        if (assistantSnapshot.text.length === 0) {
          stabilizedAt = null;
        } else if (assistantSnapshot.text !== lastObservedText) {
          lastObservedText = assistantSnapshot.text;
          stabilizedAt = now();
        } else if (
          stabilizedAt !== null &&
          now() - stabilizedAt >= quiescenceMs &&
          !(await hasGeneratingIndicator(page))
        ) {
          return {
            assistantText: assistantSnapshot.text,
            completedAt: new Date().toISOString(),
            pageUrl: page.url(),
            failureCode: null,
            failureClass: null,
            failureStage: null,
            submittedAt
          };
        }
      }

      await delay(pollIntervalMs);
    }

    const latestSnapshot = await readAssistantSnapshot(page);
    const assistantFailureStage = assistantObserved ? "capture" : "submitted";

    if (latestSnapshot.selectorId) {
      assistantSelectorDetected = true;
    }

    if (
      latestSnapshot.count > baselineAssistantSnapshot.count &&
      latestSnapshot.text.length === 0
    ) {
      return buildFailureResult(
        page,
        "reply_empty",
        "fatal",
        "capture",
        submittedAt
      );
    }

    if (!assistantSelectorDetected) {
      return buildFailureResult(
        page,
        "assistant_turn_selector_not_found",
        "fatal",
        assistantFailureStage,
        submittedAt
      );
    }

    return buildFailureResult(
      page,
      "reply_timeout",
      "fatal",
      assistantFailureStage,
      submittedAt
    );
  });
}

export type {
  RelayBrowserContextLike,
  RelayPageLike,
  RelayLocatorLike
};

export function toRelayBrowserContext(
  browserContext: BrowserContext
): RelayBrowserContextLike {
  return browserContext as unknown as RelayBrowserContextLike;
}

export function toRelayPage(page: Page): RelayPageLike {
  return page as unknown as RelayPageLike;
}
