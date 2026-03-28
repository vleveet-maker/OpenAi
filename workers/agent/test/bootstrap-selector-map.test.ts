import { describe, expect, it } from "vitest";

import { buildModelLabelPattern } from "../src/chat-bootstrap/bootstrap-selector-map.js";

describe("bootstrap selector map", () => {
  it("escapes model labels into exact-match regex patterns", () => {
    const pattern = buildModelLabelPattern("GPT-5.4 Thinking (Latest)");

    expect(pattern.test("GPT-5.4 Thinking (Latest)")).toBe(true);
    expect(pattern.test(" GPT-5.4 Thinking (Latest) ")).toBe(true);
    expect(pattern.test("GPT-5.4 Thinking")).toBe(false);
  });
});
