export interface BootstrapLocatorLike {
  last(): BootstrapLocatorLike;
  count(): Promise<number>;
  isVisible(): Promise<boolean>;
  click(): Promise<void>;
}

export interface BootstrapPageLike {
  url(): string;
  title?(): Promise<string>;
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
export interface ModelOptionSelectorTarget {
  labelPattern: RegExp;
  testIdSelectors: string[];
}
export type ModelOptionLocatorCandidate =
  (page: BootstrapPageLike, target: ModelOptionSelectorTarget) => BootstrapLocatorLike;
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

function slugifyModelLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildModelOptionTarget(label: string): ModelOptionSelectorTarget {
  const slug = slugifyModelLabel(label);

  return {
    labelPattern: buildModelLabelPattern(label),
    testIdSelectors: slug
      ? [`[data-testid='model-switcher-${slug}']`, `[data-testid*='${slug}']`]
      : []
  };
}

export const newChatNamePatterns = [/new chat/i, /новый чат/i];
export const temporaryEntryNamePatterns = [
  /temporary chat/i,
  /temporary/i,
  /временн(?:ый|ого)? чат/i,
  /временн/i
];
export const temporaryEnabledNamePatterns = [
  /disable temporary chat/i,
  /turn off temporary chat/i,
  /выключить временный чат/i
];
export const temporaryOnboardingContinueNamePatterns = [/continue/i, /продолж/i];

export const newChatSelectorCandidates: BootstrapLocatorCandidateDefinition[] = [
  {
    id: "new_chat_link_role",
    locate: (page) => page.getByRole("link", { name: newChatNamePatterns[0] }).last()
  },
  {
    id: "new_chat_button_role",
    locate: (page) => page.getByRole("button", { name: newChatNamePatterns[0] }).last()
  },
  {
    id: "new_chat_link_localized_role",
    locate: (page) => page.getByRole("link", { name: newChatNamePatterns[1] }).last()
  },
  {
    id: "new_chat_button_localized_role",
    locate: (page) => page.getByRole("button", { name: newChatNamePatterns[1] }).last()
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
      id: "temporary_button_localized",
      locate: (page) => page.getByRole("button", { name: /temporary|временн/i }).last()
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
      id: "temporary_link_localized",
      locate: (page) => page.getByRole("link", { name: /temporary|временн/i }).last()
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
      id: "temporary_menuitem_localized",
      locate: (page) => page.getByRole("menuitem", { name: /temporary|временн/i }).last()
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
  (page) => page.getByRole("button", { name: temporaryEnabledNamePatterns[0] }).last(),
  (page) => page.getByRole("button", { name: temporaryEnabledNamePatterns[1] }).last(),
  (page) => page.getByRole("button", { name: temporaryEnabledNamePatterns[2] }).last(),
  (page) => page.locator("[data-testid='temporary-chat-label']").last(),
  (page) => page.locator("[data-testid*='temporary']").last()
];

export const temporaryOnboardingContinueSelectorCandidates: BootstrapLocatorCandidateDefinition[] =
  [
    {
      id: "temporary_onboarding_continue_button",
      locate: (page) =>
        page.getByRole("button", { name: temporaryOnboardingContinueNamePatterns[0] }).last()
    },
    {
      id: "temporary_onboarding_continue_localized_button",
      locate: (page) =>
        page.getByRole("button", { name: temporaryOnboardingContinueNamePatterns[1] }).last()
    },
    {
      id: "temporary_onboarding_modal_button",
      locate: (page) =>
        page.locator("[data-testid='modal-temporary-chat-onboarding'] button").last()
    }
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
    locate: (page, target) => page.getByRole("option", { name: target.labelPattern }).last()
  },
  {
    id: "model_menuitem_radio",
    locate: (page, target) =>
      page.getByRole("menuitemradio", { name: target.labelPattern }).last()
  },
  {
    id: "model_menuitem_role",
    locate: (page, target) => page.getByRole("menuitem", { name: target.labelPattern }).last()
  },
  {
    id: "model_button_role",
    locate: (page, target) => page.getByRole("button", { name: target.labelPattern }).last()
  },
  {
    id: "model_link_role",
    locate: (page, target) => page.getByRole("link", { name: target.labelPattern }).last()
  },
  {
    id: "model_testid_token",
    locate: (page, target) =>
      page
        .locator(
          target.testIdSelectors.length > 0
            ? target.testIdSelectors.join(", ")
            : "[data-testid='model-switcher-missing']"
        )
        .last()
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
