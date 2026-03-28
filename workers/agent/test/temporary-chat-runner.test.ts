import { describe, expect, it } from "vitest";

import { runTemporaryChatBootstrap } from "../src/chat-bootstrap/temporary-chat-runner.js";

class FakeLocator {
  constructor(
    private readonly resolver: () => {
      count: number;
      visible: boolean;
    },
    private readonly actions: {
      click?: () => Promise<void>;
    } = {}
  ) {}

  last(): FakeLocator {
    return this;
  }

  async count(): Promise<number> {
    return this.resolver().count;
  }

  async isVisible(): Promise<boolean> {
    return this.resolver().visible;
  }

  async click(): Promise<void> {
    await this.actions.click?.();
  }
}

class FakePage {
  public newChatClicks = 0;
  public temporaryChatClicks = 0;
  public modelPickerClicks = 0;
  public selectedModel: string | null = null;
  private currentUrl = "https://chatgpt.com/";
  private temporaryModeActive = false;
  private temporaryEntryClicked = false;
  private modelPickerOpen = false;

  constructor(
    private readonly options: {
      authUrl?: string;
      showAuthButtons?: boolean;
      newChatAvailable?: boolean;
      directTemporaryAvailable?: boolean;
      modelMenuTemporaryAvailable?: boolean;
      temporaryConfirmationAvailable?: boolean;
      modelPickerAvailable?: boolean;
      availableModels?: string[];
    } = {}
  ) {
    if (options.authUrl) {
      this.currentUrl = options.authUrl;
    }
  }

  url(): string {
    return this.currentUrl;
  }

  async goto(url: string): Promise<void> {
    if (!this.options.authUrl) {
      this.currentUrl = url;
    }
  }

  getByRole(role: string, options?: { name?: string | RegExp }): FakeLocator {
    const namePattern = options?.name instanceof RegExp ? options.name : null;
    const availableModels =
      this.options.availableModels ?? ["GPT-5.4 Thinking", "GPT-5.4"];

    if (
      (role === "link" || role === "button") &&
      namePattern?.test("New chat")
    ) {
      return new FakeLocator(
        () => ({
          count: this.options.newChatAvailable === false ? 0 : 1,
          visible: this.options.newChatAvailable !== false
        }),
        {
          click: async () => {
            this.newChatClicks += 1;
          }
        }
      );
    }

    if (
      (role === "button" || role === "link") &&
      namePattern?.test("Temporary Chat")
    ) {
      return new FakeLocator(
        () => ({
          count:
            this.options.directTemporaryAvailable === false
              ? 0
              : this.modelPickerOpen
                ? 0
                : this.temporaryModeActive &&
                    this.options.temporaryConfirmationAvailable === false
                  ? 0
                : this.temporaryEntryClicked && !this.temporaryModeActive
                  ? 0
                : 1,
          visible:
            this.options.directTemporaryAvailable === false
              ? false
              : this.modelPickerOpen
                ? false
                : this.temporaryModeActive &&
                    this.options.temporaryConfirmationAvailable === false
                  ? false
                : this.temporaryEntryClicked && !this.temporaryModeActive
                  ? false
                : true
        }),
        {
          click: async () => {
            this.temporaryChatClicks += 1;
            this.temporaryEntryClicked = true;
            this.temporaryModeActive =
              this.options.temporaryConfirmationAvailable !== false;
          }
        }
      );
    }

    if (
      (role === "button" || role === "link" || role === "menuitem") &&
      namePattern?.test("Temporary")
    ) {
      return new FakeLocator(
        () => ({
          count:
            this.modelPickerOpen &&
            this.options.modelMenuTemporaryAvailable !== false
              ? 1
              : this.temporaryModeActive &&
                  this.options.temporaryConfirmationAvailable !== false
                ? 1
                : 0,
          visible:
            this.modelPickerOpen &&
            this.options.modelMenuTemporaryAvailable !== false
              ? true
              : this.temporaryModeActive &&
                  this.options.temporaryConfirmationAvailable !== false
                ? true
                : false
        }),
        {
          click: async () => {
            this.temporaryChatClicks += 1;
            this.temporaryEntryClicked = true;
            this.temporaryModeActive =
              this.options.temporaryConfirmationAvailable !== false;
            this.modelPickerOpen = false;
          }
        }
      );
    }

    if (
      role === "button" &&
      namePattern?.test("GPT-5.4 Thinking")
    ) {
      return new FakeLocator(
        () => ({
          count:
            this.modelPickerOpen && availableModels.includes("GPT-5.4 Thinking")
              ? 1
              : 0,
          visible:
            this.modelPickerOpen && availableModels.includes("GPT-5.4 Thinking")
        }),
        {
          click: async () => {
            this.selectedModel = "GPT-5.4 Thinking";
            this.modelPickerOpen = false;
          }
        }
      );
    }

    if (
      role === "button" &&
      namePattern?.test("GPT-5.4")
    ) {
      return new FakeLocator(
        () => ({
          count:
            this.modelPickerOpen && availableModels.includes("GPT-5.4") ? 1 : 0,
          visible:
            this.modelPickerOpen && availableModels.includes("GPT-5.4")
        }),
        {
          click: async () => {
            this.selectedModel = "GPT-5.4";
            this.modelPickerOpen = false;
          }
        }
      );
    }

    if (
      (role === "option" || role === "menuitemradio" || role === "link") &&
      namePattern?.test("GPT-5.4 Thinking")
    ) {
      return new FakeLocator(
        () => ({
          count:
            this.modelPickerOpen && availableModels.includes("GPT-5.4 Thinking")
              ? 1
              : 0,
          visible:
            this.modelPickerOpen && availableModels.includes("GPT-5.4 Thinking")
        }),
        {
          click: async () => {
            this.selectedModel = "GPT-5.4 Thinking";
            this.modelPickerOpen = false;
          }
        }
      );
    }

    if (
      (role === "option" || role === "menuitemradio" || role === "link") &&
      namePattern?.test("GPT-5.4")
    ) {
      return new FakeLocator(
        () => ({
          count:
            this.modelPickerOpen && availableModels.includes("GPT-5.4") ? 1 : 0,
          visible:
            this.modelPickerOpen && availableModels.includes("GPT-5.4")
        }),
        {
          click: async () => {
            this.selectedModel = "GPT-5.4";
            this.modelPickerOpen = false;
          }
        }
      );
    }

    return new FakeLocator(() => ({
      count: 0,
      visible: false
    }));
  }

  locator(selector: string): FakeLocator {
    if (
      selector.includes("login-button") ||
      selector.includes("signup-button")
    ) {
      return new FakeLocator(() => ({
        count: this.options.showAuthButtons ? 1 : 0,
        visible: this.options.showAuthButtons === true
      }));
    }

    if (selector.includes("model-switcher") || selector.includes("model-picker")) {
      return new FakeLocator(
        () => ({
          count: this.options.modelPickerAvailable === false ? 0 : 1,
          visible: this.options.modelPickerAvailable !== false
        }),
        {
          click: async () => {
            this.modelPickerClicks += 1;
            this.modelPickerOpen = true;
          }
        }
      );
    }

    if (selector.includes("new-chat")) {
      return new FakeLocator(
        () => ({
          count: this.options.newChatAvailable === false ? 0 : 1,
          visible: this.options.newChatAvailable !== false
        }),
        {
          click: async () => {
            this.newChatClicks += 1;
          }
        }
      );
    }

    if (selector.includes("temporary-chat")) {
      return new FakeLocator(
        () => ({
          count:
            this.options.directTemporaryAvailable === false
              ? 0
              : this.modelPickerOpen
                ? 0
                : this.temporaryModeActive &&
                    this.options.temporaryConfirmationAvailable === false
                  ? 0
                : this.temporaryEntryClicked && !this.temporaryModeActive
                  ? 0
                : 1,
          visible:
            this.options.directTemporaryAvailable === false
              ? false
              : this.modelPickerOpen
                ? false
                : this.temporaryModeActive &&
                    this.options.temporaryConfirmationAvailable === false
                  ? false
                : this.temporaryEntryClicked && !this.temporaryModeActive
                  ? false
                : true
        }),
        {
          click: async () => {
            this.temporaryChatClicks += 1;
            this.temporaryEntryClicked = true;
            this.temporaryModeActive =
              this.options.temporaryConfirmationAvailable !== false;
          }
        }
      );
    }

    if (selector.includes("[data-testid*='temporary']")) {
      return new FakeLocator(() => ({
        count:
          this.temporaryModeActive &&
          this.options.temporaryConfirmationAvailable !== false
            ? 1
            : 0,
        visible:
          this.temporaryModeActive &&
          this.options.temporaryConfirmationAvailable !== false
      }));
    }

    return new FakeLocator(() => ({
      count: 0,
      visible: false
    }));
  }
}

class FakeBrowserContext {
  constructor(private readonly page: FakePage) {}

  pages(): FakePage[] {
    return [this.page];
  }

  async newPage(): Promise<FakePage> {
    return this.page;
  }
}

describe("runTemporaryChatBootstrap", () => {
  it("creates a fresh temporary chat through the direct Temporary Chat entry", async () => {
    const page = new FakePage();
    const context = new FakeBrowserContext(page);

    const result = await runTemporaryChatBootstrap(context, {
      lockKey: "dad:session-1",
      startUrl: "https://chatgpt.com/",
      preferredReasoningModelLabels: ["GPT-5.4 Thinking", "GPT-5.4"]
    });

    expect(result).toMatchObject({
      status: "ready",
      conversationMode: "temporary",
      modelLabel: "GPT-5.4 Thinking",
      failureCode: null
    });
    expect(page.newChatClicks).toBe(1);
    expect(page.temporaryChatClicks).toBe(1);
    expect(page.modelPickerClicks).toBe(1);
    expect(page.selectedModel).toBe("GPT-5.4 Thinking");
  });

  it("falls back to a model-menu temporary entry when no direct Temporary Chat control exists", async () => {
    const page = new FakePage({
      directTemporaryAvailable: false
    });
    const context = new FakeBrowserContext(page);

    const result = await runTemporaryChatBootstrap(context, {
      lockKey: "wife:session-1",
      startUrl: "https://chatgpt.com/",
      preferredReasoningModelLabels: ["GPT-5.4 Thinking", "GPT-5.4"]
    });

    expect(result.status).toBe("ready");
    expect(result.conversationMode).toBe("temporary");
    expect(page.modelPickerClicks).toBeGreaterThanOrEqual(2);
    expect(page.temporaryChatClicks).toBe(1);
  });

  it("continues from the current surface when no New chat control is present", async () => {
    const page = new FakePage({
      newChatAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-2",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking", "GPT-5.4"]
      }
    );

    expect(result.status).toBe("ready");
    expect(page.newChatClicks).toBe(0);
    expect(page.modelPickerClicks).toBe(1);
  });

  it("fails with bootstrap_auth_required when ChatGPT redirects to login", async () => {
    const page = new FakePage({
      authUrl: "https://chatgpt.com/auth/login"
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("bootstrap_auth_required");
  });

  it("fails with bootstrap_auth_required when the current surface exposes login buttons", async () => {
    const page = new FakePage({
      showAuthButtons: true,
      newChatAvailable: false,
      directTemporaryAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("bootstrap_auth_required");
  });

  it("fails with new_chat_selector_not_found when New chat is missing", async () => {
    const page = new FakePage({
      newChatAvailable: false,
      modelPickerAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("new_chat_selector_not_found");
  });

  it("fails with temporary_entry_not_found when neither direct nor model-menu temporary entry exists", async () => {
    const page = new FakePage({
      directTemporaryAvailable: false,
      modelMenuTemporaryAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("temporary_entry_not_found");
  });

  it("fails with temporary_confirmation_not_found when Temporary mode never becomes visible", async () => {
    const page = new FakePage({
      temporaryConfirmationAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("temporary_confirmation_not_found");
  });

  it("fails with model_picker_not_found when the current UI exposes no model picker", async () => {
    const page = new FakePage({
      modelPickerAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("model_picker_not_found");
  });

  it("fails with model_option_not_found when no preferred model alias is available", async () => {
    const page = new FakePage({
      availableModels: ["GPT-4o"]
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking", "GPT-5.4"]
      }
    );

    expect(result.failureCode).toBe("model_option_not_found");
  });
});
