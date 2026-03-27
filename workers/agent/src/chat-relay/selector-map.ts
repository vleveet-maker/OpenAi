export interface RelayLocatorLike {
  last(): RelayLocatorLike;
  count(): Promise<number>;
  isVisible(): Promise<boolean>;
  fill(value: string): Promise<void>;
  click(): Promise<void>;
  press(key: string): Promise<void>;
  innerText(): Promise<string>;
}

export interface RelayPageLike {
  url(): string;
  getByRole(
    role: string,
    options?: {
      name?: string | RegExp;
    }
  ): RelayLocatorLike;
  locator(selector: string): RelayLocatorLike;
  keyboard: {
    press(key: string): Promise<void>;
  };
  goto?(url: string, options?: { waitUntil?: "domcontentloaded" }): Promise<void>;
}

export type RelayLocatorCandidate = (page: RelayPageLike) => RelayLocatorLike;

export const composerSelectors: RelayLocatorCandidate[] = [
  (page) => page.getByRole("textbox").last(),
  (page) => page.locator("[contenteditable='true']").last()
];

export const sendButtonSelectors: RelayLocatorCandidate[] = [
  (page) => page.getByRole("button", { name: /send/i }).last(),
  (page) => page.locator("button[aria-label*='Send']").last(),
  (page) => page.locator("button[data-testid*='send']").last()
];

export const assistantTurnSelectors: RelayLocatorCandidate[] = [
  (page) => page.locator("[data-message-author-role='assistant']"),
  (page) => page.locator("[data-testid*='conversation-turn-assistant']"),
  (page) => page.locator("article[data-role='assistant']")
];

export const generatingIndicators: RelayLocatorCandidate[] = [
  (page) => page.locator("button[aria-label*='Stop']").last(),
  (page) => page.locator("[data-testid*='stop-button']").last(),
  (page) => page.locator("[data-testid*='typing-indicator']").last()
];
