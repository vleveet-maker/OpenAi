import { describe, expect, it } from "vitest";

import {
  assistantTurnSelectorCandidates,
  composerSelectorCandidates,
  generatingIndicatorSelectorCandidates,
  sendButtonSelectorCandidates
} from "../src/chat-relay/selector-map.js";

describe("relay selector map", () => {
  it("defines named selector groups for relay drift maintenance", () => {
    expect(
      composerSelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "role_textbox",
        "prompt_textarea_id",
        "contenteditable_fallback"
      ])
    );

    expect(
      sendButtonSelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "role_send_button",
        "aria_send_prompt",
        "testid_send_button"
      ])
    );

    expect(
      assistantTurnSelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "message_author_role_assistant",
        "conversation_turn_assistant"
      ])
    );

    expect(
      generatingIndicatorSelectorCandidates.map((candidate) => candidate.id)
    ).toEqual(
      expect.arrayContaining([
        "stop_generating_button",
        "testid_stop_button"
      ])
    );
  });
});
