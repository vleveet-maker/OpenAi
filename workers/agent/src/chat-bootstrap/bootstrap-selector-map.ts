export interface BootstrapLocatorLike {
  last(): BootstrapLocatorLike;
  count(): Promise<number>;
  isVisible(): Promise<boolean>;
  click(): Promise<void>;
}

export interface BootstrapPageLike {
  url(): string;
  getByRole(
    role: string,
    options?: {
      name?: string | RegExp;
    }
  ): BootstrapLocatorLike;
  locator(selector: string): BootstrapLocatorLike;
  goto?(url: string, options?: { waitUntil?: "domcontentloaded" }): Promise<void>;
}

export type BootstrapLocatorCandidate =
  (page: BootstrapPageLike) => BootstrapLocatorLike;
export type ModelOptionLocatorCandidate =
  (page: BootstrapPageLike, labelPattern: RegExp) => BootstrapLocatorLike;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildModelLabelPattern(label: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, "i");
}

export const newChatSelectors: BootstrapLocatorCandidate[] = [
  (page) => page.getByRole("link", { name: /new chat/i }).last(),
  (page) => page.getByRole("button", { name: /new chat/i }).last(),
  (page) => page.locator("[data-testid*='new-chat']").last(),
  (page) => page.locator("a[aria-label*='New chat']").last()
];

export const temporaryChatSelectors: BootstrapLocatorCandidate[] = [
  (page) => page.getByRole("button", { name: /temporary chat/i }).last(),
  (page) => page.getByRole("link", { name: /temporary chat/i }).last(),
  (page) => page.getByRole("menuitem", { name: /temporary chat/i }).last(),
  (page) => page.locator("[data-testid*='temporary-chat']").last()
];

export const modelPickerButtonSelectors: BootstrapLocatorCandidate[] = [
  (page) => page.locator("[data-testid*='model-switcher']").last(),
  (page) => page.locator("[data-testid*='model-picker']").last(),
  (page) => page.getByRole("button", { name: /thinking|gpt|model/i }).last()
];

export const modelOptionSelectors: ModelOptionLocatorCandidate[] = [
  (page, labelPattern) => page.getByRole("option", { name: labelPattern }).last(),
  (page, labelPattern) => page.getByRole("menuitemradio", { name: labelPattern }).last(),
  (page, labelPattern) => page.getByRole("button", { name: labelPattern }).last(),
  (page, labelPattern) => page.getByRole("link", { name: labelPattern }).last()
];
