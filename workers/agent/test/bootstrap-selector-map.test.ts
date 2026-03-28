import { describe, expect, it } from "vitest";

import {
  buildModelLabelPattern,
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
      temporaryEntrySelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "temporary_chat_button",
        "temporary_button",
        "temporary_testid"
      ])
    );
  });
});
