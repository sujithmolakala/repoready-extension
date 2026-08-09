import { describe, expect, it } from "vitest";

import { toSanitizedOpenAIConfig } from "./aiConfig";
import { isSanitizedOpenAIConfig } from "../../shared/messages";

describe("SanitizedOpenAIConfig", () => {
  it("never includes the raw API key", () => {
    const sanitized = toSanitizedOpenAIConfig({
      provider: "openai",
      validatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(sanitized.configured).toBe(true);
    expect(sanitized.provider).toBe("openai");
    expect("apiKey" in sanitized).toBe(false);
    expect(isSanitizedOpenAIConfig(sanitized)).toBe(true);
    expect(isSanitizedOpenAIConfig({ ...sanitized, apiKey: "sk-test" })).toBe(false);
  });
});
