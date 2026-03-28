import { describe, expect, it } from "vitest";

import { runRelay } from "../src/chat-relay/relay-runner.js";
import type { WorkerRelayRequest } from "../src/chat-relay/relay-types.js";

class FakeLocator {
  constructor(
    private readonly resolver: () => {
      count: number;
      visible: boolean;
      text: string;
    },
    private readonly actions: {
      fill?: (value: string) => Promise<void>;
      click?: () => Promise<void>;
      press?: (key: string) => Promise<void>;
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

  async fill(value: string): Promise<void> {
    await this.actions.fill?.(value);
  }

  async click(): Promise<void> {
    await this.actions.click?.();
  }

  async press(key: string): Promise<void> {
    await this.actions.press?.(key);
  }

  async innerText(): Promise<string> {
    return this.resolver().text;
  }
}

class FakePage {
  private submitted = false;
  private step = 0;
  public lastFilledValue = "";
  public lastFilledSelector: string | null = null;
  public sendClicks = 0;
  public composerPresses: string[] = [];

  constructor(
    private readonly options: {
      roleComposerAvailable?: boolean;
      promptTextareaIdAvailable?: boolean;
      sendButtonAvailable?: boolean;
      composerPressThrows?: boolean;
      assistantSelectorsAvailable?: boolean;
      assistantSteps?: string[][];
      indicatorSteps?: boolean[];
      pageUrl?: string;
    } = {}
  ) {}

  url(): string {
    return this.options.pageUrl ?? "https://chatgpt.com/c/test";
  }

  advanceStep(): void {
    if (this.submitted) {
      this.step += 1;
    }
  }

  async goto(): Promise<void> {}

  readonly keyboard = {
    press: async (key: string) => {
      this.composerPresses.push(key);
      this.submitted = true;
    }
  };

  getByRole(role: string, options?: { name?: string | RegExp }): FakeLocator {
    if (role === "textbox") {
      return new FakeLocator(
        () => ({
          count: this.options.roleComposerAvailable === false ? 0 : 1,
          visible: this.options.roleComposerAvailable !== false,
          text: this.lastFilledValue
        }),
        {
          fill: async (value) => {
            this.lastFilledSelector = "role_textbox";
            this.lastFilledValue = value;
          },
          press: async (key) => {
            if (this.options.composerPressThrows) {
              throw new Error("press failed");
            }

            this.composerPresses.push(key);
            this.submitted = true;
          }
        }
      );
    }

    if (role === "button" && options?.name instanceof RegExp) {
      return new FakeLocator(
        () => ({
          count: this.options.sendButtonAvailable === false ? 0 : 1,
          visible: this.options.sendButtonAvailable !== false,
          text: "Send"
        }),
        {
          click: async () => {
            this.sendClicks += 1;
            this.submitted = true;
          }
        }
      );
    }

    return new FakeLocator(() => ({
      count: 0,
      visible: false,
      text: ""
    }));
  }

  locator(selector: string): FakeLocator {
    if (selector === "#prompt-textarea") {
      return new FakeLocator(
        () => ({
          count:
            this.options.promptTextareaIdAvailable === false
              ? 0
              : this.options.roleComposerAvailable === false
                ? 1
                : 0,
          visible:
            this.options.promptTextareaIdAvailable === false
              ? false
              : this.options.roleComposerAvailable === false,
          text: this.lastFilledValue
        }),
        {
          fill: async (value) => {
            this.lastFilledSelector = "prompt_textarea_id";
            this.lastFilledValue = value;
          },
          press: async (key) => {
            if (this.options.composerPressThrows) {
              throw new Error("press failed");
            }

            this.composerPresses.push(key);
            this.submitted = true;
          }
        }
      );
    }

    if (
      selector.includes("assistant") ||
      selector.includes("data-message-author-role='assistant'")
    ) {
      return new FakeLocator(() => {
        if (this.options.assistantSelectorsAvailable === false) {
          return {
            count: 0,
            visible: false,
            text: ""
          };
        }

        const assistantSteps =
          this.options.assistantSteps ??
          [
            [],
            ["Draft reply"],
            ["Draft reply"],
            ["Final stable reply"],
            ["Final stable reply"],
            ["Final stable reply"]
          ];
        const messages =
          assistantSteps[Math.min(this.step, assistantSteps.length - 1)] ?? [];

        return {
          count: messages.length,
          visible: messages.length > 0,
          text: messages.at(-1) ?? ""
        };
      });
    }

    if (selector.includes("stop-button") || selector.includes("Stop generating")) {
      return new FakeLocator(() => {
        const indicatorSteps =
          this.options.indicatorSteps ?? [false, true, true, false, false];
        const visible =
          indicatorSteps[Math.min(this.step, indicatorSteps.length - 1)] ?? false;

        return {
          count: visible ? 1 : 0,
          visible,
          text: ""
        };
      });
    }

    if (
      selector.includes("aria-label*='Send'") ||
      selector.includes("data-testid*='send'")
    ) {
      return new FakeLocator(
        () => ({
          count: this.options.sendButtonAvailable === false ? 0 : 1,
          visible: this.options.sendButtonAvailable !== false,
          text: "Send"
        }),
        {
          click: async () => {
            this.sendClicks += 1;
            this.submitted = true;
          }
        }
      );
    }

    return new FakeLocator(() => ({
      count: 0,
      visible: false,
      text: ""
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

function buildRequest(): WorkerRelayRequest {
  return {
    sessionId: "session-1",
    userMessageId: "user-1",
    assistantMessageId: "assistant-1",
    bodyText: "Hello from relay"
  };
}

describe("runRelay", () => {
  it("includes submittedAt on a successful relay result", async () => {
    const page = new FakePage();
    const context = new FakeBrowserContext(page);
    let currentTime = 0;

    const result = await runRelay(context, buildRequest(), {
      lockKey: "dad",
      relayTimeoutMs: 50,
      quiescenceMs: 10,
      pollIntervalMs: 5,
      now: () => currentTime,
      delay: async (ms) => {
        currentTime += ms;
        page.advanceStep();
      }
    });

    expect(result.failureCode).toBeNull();
    expect(result.failureClass).toBeNull();
    expect(result.failureStage).toBeNull();
    expect(result.submittedAt).toEqual(expect.any(String));
    expect(result.assistantText).toBe("Final stable reply");
    expect(page.lastFilledValue).toBe("Hello from relay");
    expect(page.sendClicks).toBe(1);
  });

  it("uses the #prompt-textarea fallback when the role-based composer is unavailable", async () => {
    const page = new FakePage({
      roleComposerAvailable: false
    });
    const context = new FakeBrowserContext(page);
    let currentTime = 0;

    const result = await runRelay(context, buildRequest(), {
      lockKey: "dad",
      relayTimeoutMs: 50,
      quiescenceMs: 10,
      pollIntervalMs: 5,
      now: () => currentTime,
      delay: async (ms) => {
        currentTime += ms;
        page.advanceStep();
      }
    });

    expect(result.failureCode).toBeNull();
    expect(page.lastFilledSelector).toBe("prompt_textarea_id");
    expect(page.lastFilledValue).toBe("Hello from relay");
    expect(page.sendClicks).toBe(1);
  });

  it("classifies missing composer selectors explicitly", async () => {
    const page = new FakePage({
      roleComposerAvailable: false,
      promptTextareaIdAvailable: false
    });
    const context = new FakeBrowserContext(page);

    const result = await runRelay(context, buildRequest(), {
      lockKey: "dad"
    });

    expect(result.failureCode).toBe("composer_selector_not_found");
    expect(result.failureClass).toBe("transient");
    expect(result.failureStage).toBe("dispatch");
    expect(result.submittedAt).toBeNull();
  });

  it("classifies a missing send path explicitly when Enter fallback fails", async () => {
    const page = new FakePage({
      sendButtonAvailable: false,
      composerPressThrows: true
    });
    const context = new FakeBrowserContext(page);

    const result = await runRelay(context, buildRequest(), {
      lockKey: "dad"
    });

    expect(result.failureCode).toBe("send_button_selector_not_found");
    expect(result.failureClass).toBe("transient");
    expect(result.failureStage).toBe("dispatch");
    expect(result.submittedAt).toBeNull();
  });

  it("classifies missing assistant turn selectors explicitly after submit", async () => {
    const page = new FakePage({
      assistantSelectorsAvailable: false,
      indicatorSteps: [false, false, false, false]
    });
    const context = new FakeBrowserContext(page);
    let currentTime = 0;

    const result = await runRelay(context, buildRequest(), {
      lockKey: "dad",
      relayTimeoutMs: 15,
      quiescenceMs: 10,
      pollIntervalMs: 5,
      now: () => currentTime,
      delay: async (ms) => {
        currentTime += ms;
        page.advanceStep();
      }
    });

    expect(result.failureCode).toBe("assistant_turn_selector_not_found");
    expect(result.failureClass).toBe("fatal");
    expect(result.failureStage).toBe("submitted");
    expect(result.submittedAt).toEqual(expect.any(String));
  });

  it("keeps reply_timeout for partial assistant output that never stabilizes", async () => {
    const page = new FakePage({
      assistantSteps: [
        [],
        ["Draft reply"],
        ["Still typing"],
        ["Still typing"],
        ["Still typing"]
      ],
      indicatorSteps: [true, true, true, true, true]
    });
    const context = new FakeBrowserContext(page);
    let currentTime = 0;

    const result = await runRelay(context, buildRequest(), {
      lockKey: "dad",
      relayTimeoutMs: 15,
      quiescenceMs: 10,
      pollIntervalMs: 5,
      now: () => currentTime,
      delay: async (ms) => {
        currentTime += ms;
        page.advanceStep();
      }
    });

    expect(result.failureCode).toBe("reply_timeout");
    expect(result.failureClass).toBe("fatal");
    expect(result.failureStage).toBe("capture");
    expect(result.submittedAt).toEqual(expect.any(String));
  });
});
