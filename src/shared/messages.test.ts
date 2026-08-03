import { describe, expect, it } from "vitest";

import { isValidateGitHubTokenResponse } from "./messages";

describe("isValidateGitHubTokenResponse", () => {
  it("accepts successful sanitized auth responses", () => {
    expect(
      isValidateGitHubTokenResponse({
        success: true,
        authState: {
          authenticated: true,
          username: "sujithmolakala",
          avatarUrl: null,
          validatedAt: "2026-08-03T00:00:00.000Z",
        },
      }),
    ).toBe(true);
  });

  it("rejects responses that include a token field", () => {
    expect(
      isValidateGitHubTokenResponse({
        success: true,
        token: "github_pat_secret",
        authState: {
          authenticated: true,
          username: "sujithmolakala",
          avatarUrl: null,
          validatedAt: "2026-08-03T00:00:00.000Z",
        },
      }),
    ).toBe(false);
  });
});
