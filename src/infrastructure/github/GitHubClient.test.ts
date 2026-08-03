import { describe, expect, it, vi } from "vitest";

import { AuthErrorCode } from "../../domain/errors";
import {
  GitHubClient,
  parseGitHubUser,
} from "./GitHubClient";

function createClient(fetchFn: typeof fetch): GitHubClient {
  return new GitHubClient(
    {
      getToken: async () => "github_pat_test",
      getAuthState: async () => null,
      isAuthenticated: async () => true,
    },
    fetchFn,
  );
}

describe("GitHubClient.validateToken", () => {
  it("accepts a minimal valid response with only login", async () => {
    const fetchFn = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer github_pat_test",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      });

      return Response.json({ login: "sujithmolakala" });
    });

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).resolves.toEqual({
      login: "sujithmolakala",
      avatarUrl: null,
    });
  });

  it("accepts a valid response when avatar_url is null", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({
        login: "sujithmolakala",
        avatar_url: null,
      }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).resolves.toEqual({
      login: "sujithmolakala",
      avatarUrl: null,
    });
  });

  it("accepts a valid response when name is null", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({
        login: "sujithmolakala",
        name: null,
        avatar_url: "https://github.com/avatar.png",
      }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).resolves.toEqual({
      login: "sujithmolakala",
      avatarUrl: "https://github.com/avatar.png",
    });
  });

  it("maps 401 responses to invalid token", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      new Response(null, { status: 401 }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).rejects.toMatchObject({
      code: AuthErrorCode.INVALID_TOKEN,
      message: "This token is invalid or has expired.",
    });
  });

  it("maps 403 responses to permission errors", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      new Response(null, {
        status: 403,
        headers: { "X-RateLimit-Remaining": "42" },
      }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).rejects.toMatchObject({
      code: AuthErrorCode.INSUFFICIENT_PERMISSIONS,
    });
  });

  it("maps 403 rate-limit responses using X-RateLimit-Remaining: 0", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      new Response(null, {
        status: 403,
        headers: { "X-RateLimit-Remaining": "0" },
      }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).rejects.toMatchObject({
      code: AuthErrorCode.RATE_LIMITED,
    });
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new Error("offline");
    });

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).rejects.toMatchObject({
      code: AuthErrorCode.NETWORK_ERROR,
    });
  });

  it("maps malformed JSON on 200 to malformed response", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).rejects.toMatchObject({
      code: AuthErrorCode.MALFORMED_RESPONSE,
      message: "GitHub returned a malformed response.",
    });
  });

  it("maps 200 JSON without login to unexpected response", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({ id: 1, name: null }),
    );

    const client = createClient(fetchFn);

    await expect(client.validateToken("github_pat_test")).rejects.toMatchObject({
      code: AuthErrorCode.MALFORMED_RESPONSE,
      message: "GitHub returned an unexpected response. Try again later.",
    });
  });

  it("never returns the token in parsed user data", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({ login: "sujithmolakala" }),
    );

    const client = createClient(fetchFn);
    const user = await client.validateToken("github_pat_test");

    expect(user).not.toHaveProperty("token");
    expect(JSON.stringify(user)).not.toContain("github_pat_test");
  });
});

describe("parseGitHubUser", () => {
  it("accepts minimal valid login-only payloads", () => {
    expect(parseGitHubUser({ login: "sujithmolakala" })).toEqual({
      login: "sujithmolakala",
      avatarUrl: null,
    });
  });
});
