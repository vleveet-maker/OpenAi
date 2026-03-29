import { describe, expect, it } from "vitest";

import {
  buildModelLabelPattern,
  buildModelOptionTarget,
  composerReadySelectorCandidates,
  temporaryConfirmationSelectorCandidates,
  temporaryEntryNamePatterns,
  temporaryEntrySelectorCandidates
} from "../src/chat-bootstrap/bootstrap-selector-map.js";

describe("bootstrap selector map", () => {
  it("escapes model labels into exact-match regex patterns", () => {
    const pattern = buildModelLabelPattern("GPT-5.4 Thinking (Latest)");

    expect(pattern.test("GPT-5.4 Thinking (Latest)")).toBe(true);
    expect(pattern.test(" GPT-5.4 Thinking (Latest) ")).toBe(true);
    expect(pattern.test("GPT-5.4 Thinking")).toBe(false);
  });

  it("includes temporary chat and temporary aliases for entry selectors", () => {
    expect(
      temporaryEntryNamePatterns.some((pattern) => pattern.test("Temporary Chat"))
    ).toBe(true);
    expect(
      temporaryEntryNamePatterns.some((pattern) => pattern.test("Temporary"))
    ).toBe(true);
    expect(
      temporaryEntryNamePatterns.some((pattern) =>
        pattern.test("Включить временный чат")
      )
    ).toBe(true);
    expect(
      temporaryEntrySelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "temporary_chat_button",
        "temporary_button",
        "temporary_button_localized",
        "temporary_testid"
      ])
    );
  });

  it("builds stable model-switcher test-id selectors for preferred model aliases", () => {
    expect(buildModelOptionTarget("GPT-5.4 Thinking").testIdSelectors).toEqual([
      "[data-testid='model-switcher-gpt-5-4-thinking']",
      "[data-testid*='gpt-5-4-thinking']"
    ]);
  });

  it("centralizes temporary confirmation and composer selectors used by bootstrap", () => {
    expect(
      temporaryConfirmationSelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "temporary_chat_label",
        "temporary_surface_testid"
      ])
    );
    expect(
      composerReadySelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "prompt_textarea_id",
        "prompt_textarea_testid",
        "contenteditable_prompt_testid",
        "textarea_placeholder_message",
        "contenteditable_fallback"
      ])
    );
  });
});
