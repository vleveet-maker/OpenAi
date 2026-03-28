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

  constructor(
    private readonly options: {
      authUrl?: string;
      newChatAvailable?: boolean;
      temporaryChatAvailable?: boolean;
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
    const availableModels = this.options.availableModels ?? ["GPT-5.4 Thinking"];

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
      (role === "button" || role === "link" || role === "menuitem") &&
      namePattern?.test("Temporary Chat")
    ) {
      return new FakeLocator(
        () => ({
          count: this.options.temporaryChatAvailable === false ? 0 : 1,
          visible: this.options.temporaryChatAvailable !== false
        }),
        {
          click: async () => {
            this.temporaryChatClicks += 1;
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
          count: availableModels.includes("GPT-5.4 Thinking") ? 1 : 0,
          visible: availableModels.includes("GPT-5.4 Thinking")
        }),
        {
          click: async () => {
            this.selectedModel = "GPT-5.4 Thinking";
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
          count: availableModels.includes("GPT-5.4 Thinking") ? 1 : 0,
          visible: availableModels.includes("GPT-5.4 Thinking")
        }),
        {
          click: async () => {
            this.selectedModel = "GPT-5.4 Thinking";
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
    if (selector.includes("model-switcher") || selector.includes("model-picker")) {
      return new FakeLocator(
        () => ({
          count: 1,
          visible: true
        }),
        {
          click: async () => {
            this.modelPickerClicks += 1;
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
          count: this.options.temporaryChatAvailable === false ? 0 : 1,
          visible: this.options.temporaryChatAvailable !== false
        }),
        {
          click: async () => {
            this.temporaryChatClicks += 1;
          }
        }
      );
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
  it("creates a fresh temporary chat and selects the preferred model", async () => {
    const page = new FakePage();
    const context = new FakeBrowserContext(page);

    const result = await runTemporaryChatBootstrap(context, {
      lockKey: "dad:session-1",
      startUrl: "https://chatgpt.com/",
      preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
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

  it("fails when Temporary Chat is unavailable", async () => {
    const page = new FakePage({
      temporaryChatAvailable: false
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("temporary_chat_unavailable");
  });

  it("fails when the preferred model is unavailable", async () => {
    const page = new FakePage({
      availableModels: ["GPT-4o"]
    });

    const result = await runTemporaryChatBootstrap(
      new FakeBrowserContext(page),
      {
        lockKey: "dad:session-1",
        startUrl: "https://chatgpt.com/",
        preferredReasoningModelLabels: ["GPT-5.4 Thinking"]
      }
    );

    expect(result.failureCode).toBe("model_not_available");
  });
});
