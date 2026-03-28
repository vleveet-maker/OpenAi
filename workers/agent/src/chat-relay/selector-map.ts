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
export interface RelayLocatorCandidateDefinition {
  id: string;
  locate: RelayLocatorCandidate;
}

export const composerSelectorCandidates: RelayLocatorCandidateDefinition[] = [
  {
    id: "role_textbox",
    locate: (page) => page.getByRole("textbox").last()
  },
  {
    id: "prompt_textarea_id",
    locate: (page) => page.locator("#prompt-textarea").last()
  },
  {
    id: "prompt_textarea_testid",
    locate: (page) => page.locator("[data-testid='prompt-textarea']").last()
  },
  {
    id: "contenteditable_prompt_testid",
    locate: (page) =>
      page.locator("[contenteditable='true'][data-testid*='prompt']").last()
  },
  {
    id: "textarea_placeholder_message",
    locate: (page) => page.locator("textarea[placeholder*='Message']").last()
  },
  {
    id: "contenteditable_fallback",
    locate: (page) => page.locator("[contenteditable='true']").last()
  }
];

export const sendButtonSelectorCandidates: RelayLocatorCandidateDefinition[] = [
  {
    id: "role_send_button",
    locate: (page) => page.getByRole("button", { name: /send/i }).last()
  },
  {
    id: "aria_send_prompt",
    locate: (page) => page.locator("button[aria-label*='Send prompt']").last()
  },
  {
    id: "aria_send_message",
    locate: (page) => page.locator("button[aria-label*='Send message']").last()
  },
  {
    id: "aria_send_button",
    locate: (page) => page.locator("button[aria-label*='Send']").last()
  },
  {
    id: "testid_send_button",
    locate: (page) => page.locator("button[data-testid*='send']").last()
  }
];

export const assistantTurnSelectorCandidates: RelayLocatorCandidateDefinition[] = [
  {
    id: "message_author_role_assistant",
    locate: (page) => page.locator("div[data-message-author-role='assistant']")
  },
  {
    id: "conversation_turn_assistant",
    locate: (page) => page.locator("[data-testid*='conversation-turn-assistant']")
  },
  {
    id: "article_role_assistant",
    locate: (page) => page.locator("article[data-role='assistant']")
  }
];

export const generatingIndicatorSelectorCandidates: RelayLocatorCandidateDefinition[] =
  [
    {
      id: "stop_generating_button",
      locate: (page) => page.locator("button[aria-label*='Stop generating']").last()
    },
    {
      id: "stop_button_aria",
      locate: (page) => page.locator("button[aria-label*='Stop']").last()
    },
    {
      id: "testid_stop_button",
      locate: (page) => page.locator("[data-testid*='stop-button']").last()
    },
    {
      id: "typing_indicator",
      locate: (page) => page.locator("[data-testid*='typing-indicator']").last()
    }
  ];

export const composerSelectors: RelayLocatorCandidate[] = composerSelectorCandidates.map(
  (candidate) => candidate.locate
);

export const sendButtonSelectors: RelayLocatorCandidate[] =
  sendButtonSelectorCandidates.map((candidate) => candidate.locate);

export const assistantTurnSelectors: RelayLocatorCandidate[] =
  assistantTurnSelectorCandidates.map((candidate) => candidate.locate);

export const generatingIndicators: RelayLocatorCandidate[] =
  generatingIndicatorSelectorCandidates.map((candidate) => candidate.locate);
