import { describe, expect, it, vi } from "vitest";

import {
  AIError,
  AIErrorCode,
  AIQuotaError,
  AIRateLimitError,
} from "../../domain/ai/aiErrors";
import { OpenAIProvider } from "./OpenAIProvider";

describe("OpenAIProvider", () => {
  it("maps unauthorized responses to invalid API key errors", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json(
        { error: { message: "Incorrect API key", type: "invalid_request_error" } },
        { status: 401 },
      ),
    );

    const provider = new OpenAIProvider(async () => "sk-test", fetchFn);

    await expect(provider.validateApiKey("sk-test")).rejects.toMatchObject({
      code: AIErrorCode.INVALID_API_KEY,
    });
  });

  it("maps quota failures to AIQuotaError", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json(
        { error: { type: "insufficient_quota", message: "Quota exceeded" } },
        { status: 429 },
      ),
    );

    const provider = new OpenAIProvider(async () => "sk-test", fetchFn);

    await expect(provider.validateApiKey("sk-test")).rejects.toBeInstanceOf(
      AIQuotaError,
    );
  });

  it("maps rate limits to AIRateLimitError", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json(
        { error: { type: "rate_limit_exceeded", message: "Rate limit" } },
        { status: 429 },
      ),
    );

    const provider = new OpenAIProvider(async () => "sk-test", fetchFn);

    await expect(provider.validateApiKey("sk-test")).rejects.toBeInstanceOf(
      AIRateLimitError,
    );
  });

  it("generates markdown without leaking raw response shapes", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "# Security\n\nReport privately." } }],
      }),
    );

    const provider = new OpenAIProvider(async () => "sk-test", fetchFn);

    const result = await provider.generateDocument({
      documentType: "SECURITY",
      facts: {
        owner: "owner",
        repo: "repo",
        description: null,
        primaryLanguage: null,
        packageManager: null,
        installCommand: null,
        testCommand: null,
        licenseName: null,
        readmeExcerpt: null,
        relevantPaths: [],
        hasTests: false,
        hasCi: false,
        workflowSummaries: [],
        manifestExcerpts: [],
        truncated: false,
      },
      staticTemplate: "# Security\n\n<!-- TODO: Add manually -->",
    });

    expect(result.markdown).toContain("# Security");
    expect(result.provider).toBe("openai");
    expect("choices" in result).toBe(false);
  });

  it("throws when API key is missing during generation", async () => {
    const provider = new OpenAIProvider(async () => null);

    await expect(
      provider.generateDocument({
        documentType: "SECURITY",
        facts: {
          owner: "owner",
          repo: "repo",
          description: null,
          primaryLanguage: null,
          packageManager: null,
          installCommand: null,
          testCommand: null,
          licenseName: null,
          readmeExcerpt: null,
          relevantPaths: [],
          hasTests: false,
          hasCi: false,
          workflowSummaries: [],
          manifestExcerpts: [],
          truncated: false,
        },
        staticTemplate: "# Security",
      }),
    ).rejects.toBeInstanceOf(AIError);
  });
});
