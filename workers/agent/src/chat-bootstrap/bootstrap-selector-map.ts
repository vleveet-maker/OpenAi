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
export interface BootstrapLocatorCandidateDefinition {
  id: string;
  locate: BootstrapLocatorCandidate;
}
export interface ModelOptionLocatorCandidateDefinition {
  id: string;
  locate: ModelOptionLocatorCandidate;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildModelLabelPattern(label: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, "i");
}

export const temporaryEntryNamePatterns = [/temporary chat/i, /temporary/i];

export const newChatSelectorCandidates: BootstrapLocatorCandidateDefinition[] = [
  {
    id: "new_chat_link_role",
    locate: (page) => page.getByRole("link", { name: /new chat/i }).last()
  },
  {
    id: "new_chat_button_role",
    locate: (page) => page.getByRole("button", { name: /new chat/i }).last()
  },
  {
    id: "new_chat_testid",
    locate: (page) => page.locator("[data-testid*='new-chat']").last()
  },
  {
    id: "new_chat_aria_label",
    locate: (page) => page.locator("a[aria-label*='New chat']").last()
  }
];

export const temporaryEntrySelectorCandidates: BootstrapLocatorCandidateDefinition[] =
  [
    {
      id: "temporary_chat_button",
      locate: (page) => page.getByRole("button", { name: /temporary chat/i }).last()
    },
    {
      id: "temporary_button",
      locate: (page) => page.getByRole("button", { name: /temporary/i }).last()
    },
    {
      id: "temporary_chat_link",
      locate: (page) => page.getByRole("link", { name: /temporary chat/i }).last()
    },
    {
      id: "temporary_link",
      locate: (page) => page.getByRole("link", { name: /temporary/i }).last()
    },
    {
      id: "temporary_chat_menuitem",
      locate: (page) => page.getByRole("menuitem", { name: /temporary chat/i }).last()
    },
    {
      id: "temporary_menuitem",
      locate: (page) => page.getByRole("menuitem", { name: /temporary/i }).last()
    },
    {
      id: "temporary_chat_testid",
      locate: (page) => page.locator("[data-testid*='temporary-chat']").last()
    },
    {
      id: "temporary_testid",
      locate: (page) => page.locator("[data-testid*='temporary']").last()
    }
  ];

export const temporaryConfirmationSelectors: BootstrapLocatorCandidate[] = [
  (page) => page.getByRole("button", { name: /temporary/i }).last(),
  (page) => page.getByRole("link", { name: /temporary/i }).last(),
  (page) => page.locator("[data-testid*='temporary']").last()
];

export const modelPickerButtonSelectorCandidates: BootstrapLocatorCandidateDefinition[] =
  [
    {
      id: "model_switcher_testid",
      locate: (page) => page.locator("[data-testid*='model-switcher']").last()
    },
    {
      id: "model_picker_testid",
      locate: (page) => page.locator("[data-testid*='model-picker']").last()
    },
    {
      id: "model_button_role",
      locate: (page) => page.getByRole("button", { name: /thinking|gpt|model/i }).last()
    }
  ];

export const modelOptionSelectorCandidates: ModelOptionLocatorCandidateDefinition[] = [
  {
    id: "model_option_role",
    locate: (page, labelPattern) => page.getByRole("option", { name: labelPattern }).last()
  },
  {
    id: "model_menuitem_radio",
    locate: (page, labelPattern) =>
      page.getByRole("menuitemradio", { name: labelPattern }).last()
  },
  {
    id: "model_button_role",
    locate: (page, labelPattern) => page.getByRole("button", { name: labelPattern }).last()
  },
  {
    id: "model_link_role",
    locate: (page, labelPattern) => page.getByRole("link", { name: labelPattern }).last()
  }
];

export const newChatSelectors: BootstrapLocatorCandidate[] = newChatSelectorCandidates.map(
  (candidate) => candidate.locate
);

export const temporaryEntrySelectors: BootstrapLocatorCandidate[] =
  temporaryEntrySelectorCandidates.map((candidate) => candidate.locate);

export const temporaryChatSelectors: BootstrapLocatorCandidate[] =
  temporaryEntrySelectors;

export const modelPickerButtonSelectors: BootstrapLocatorCandidate[] =
  modelPickerButtonSelectorCandidates.map((candidate) => candidate.locate);

export const modelOptionSelectors: ModelOptionLocatorCandidate[] =
  modelOptionSelectorCandidates.map((candidate) => candidate.locate);
