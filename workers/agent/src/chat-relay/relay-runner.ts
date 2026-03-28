import type { BrowserContext, Page } from "playwright";

import {
  assistantTurnSelectors,
  composerSelectors,
  generatingIndicators,
  sendButtonSelectors,
  type RelayLocatorCandidate,
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
  candidates: RelayLocatorCandidate[]
): Promise<RelayLocatorLike | null> {
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

async function readAssistantSnapshot(
  page: RelayPageLike
): Promise<AssistantSnapshot> {
  for (const candidate of assistantTurnSelectors) {
    const locator = candidate(page);
    const count = await locator.count();

    if (count === 0) {
      continue;
    }

    const latestText = (await locator.last().innerText()).trim();

    return {
      count,
      text: latestText
    };
  }

  return {
    count: 0,
    text: ""
  };
}

async function hasGeneratingIndicator(page: RelayPageLike): Promise<boolean> {
  for (const candidate of generatingIndicators) {
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

function pageRequiresAuth(page: RelayPageLike | null): boolean {
  const currentUrl = page?.url().toLowerCase() ?? "";

  return (
    currentUrl.includes("login") ||
    currentUrl.includes("signin") ||
    currentUrl.includes("auth") ||
    currentUrl.includes("challenge")
  );
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
    const baselineAssistantSnapshot = await readAssistantSnapshot(page);
    const composer = await resolveUsableLocator(page, composerSelectors);

    if (!composer) {
      return buildFailureResult(
        page,
        "selector_not_found",
        pageRequiresAuth(page) ? "auth" : "transient",
        "dispatch",
        null
      );
    }

    try {
      await composer.fill(request.bodyText);
      const sendButton = await resolveUsableLocator(page, sendButtonSelectors);

      if (sendButton) {
        await sendButton.click();
      } else {
        await composer.press("Enter");
      }
    } catch {
      return buildFailureResult(
        page,
        "submit_failed",
        pageRequiresAuth(page) ? "auth" : "transient",
        "dispatch",
        null
      );
    }

    const submittedAt = new Date().toISOString();
    const startedAt = now();
    let lastObservedText = "";
    let stabilizedAt: number | null = null;
    let assistantObserved = false;

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

    return buildFailureResult(
      page,
      "reply_timeout",
      "fatal",
      assistantObserved ? "capture" : "submitted",
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
