import { describe, expect, it, vi } from "vitest";

import { createAuthHandlers } from "./auth-handlers";
import { DisconnectGitHubUseCase } from "../application/DisconnectGitHubUseCase";
import { GetAuthStateUseCase } from "../application/GetAuthStateUseCase";
import { ValidateGitHubTokenUseCase } from "../application/ValidateGitHubTokenUseCase";
import { AuthErrorCode } from "../domain/errors";
import { disconnectedAuthState } from "../domain/auth";
import { GitHubClient } from "../infrastructure/github/GitHubClient";
import { TokenStore } from "../infrastructure/storage/TokenStore";

describe("background auth handlers", () => {
  it("never returns the raw token to UI contexts", async () => {
    const storage = new Map<string, unknown>();

    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];

            return Object.fromEntries(
              keyList.map((key) => [key, storage.get(key)]),
            );
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              storage.set(key, value);
            }
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];

            for (const key of keyList) {
              storage.delete(key);
            }
          }),
        },
      },
      runtime: {
        sendMessage: vi.fn(),
      },
    });

    const fetchFn = vi.fn(async () =>
      Response.json({
        login: "octocat",
        avatar_url: "https://github.com/avatar.png",
      }),
    );

    const tokenStore = new TokenStore();
    const githubClient = new GitHubClient(
      {
        getToken: async () => tokenStore.getToken(),
        getAuthState: async () => tokenStore.getAuthState(),
        isAuthenticated: async () => false,
      },
      fetchFn,
    );

    const authHandlers = createAuthHandlers(
      new GetAuthStateUseCase(tokenStore),
      new ValidateGitHubTokenUseCase(githubClient, tokenStore),
      new DisconnectGitHubUseCase(tokenStore),
      vi.fn(),
    );

    const validateResponse = await authHandlers.handleValidateGitHubToken(
      "github_pat_secret",
    );
    const authStateResponse = await authHandlers.handleGetAuthState();
    const disconnectResponse = await authHandlers.handleDisconnectGitHub();
    const authStateAfterDisconnect = await authHandlers.handleGetAuthState();

    expect(validateResponse.success).toBe(true);
    expect(validateResponse.authState).toEqual({
      authenticated: true,
      username: "octocat",
      avatarUrl: "https://github.com/avatar.png",
      validatedAt: expect.any(String) as string,
    });
    expect(JSON.stringify(validateResponse)).not.toContain("github_pat_secret");
    expect(JSON.stringify(authStateResponse)).not.toContain("github_pat_secret");
    expect(JSON.stringify(disconnectResponse)).not.toContain("github_pat_secret");
    expect(authStateAfterDisconnect.authState).toEqual(disconnectedAuthState);
    expect(authStateAfterDisconnect.authState).not.toHaveProperty("token");
  });

  it("returns typed validation errors without leaking the token", async () => {
    const storage = new Map<string, unknown>();

    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];

            return Object.fromEntries(
              keyList.map((key) => [key, storage.get(key)]),
            );
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              storage.set(key, value);
            }
          }),
          remove: vi.fn(),
        },
      },
      runtime: {
        sendMessage: vi.fn(),
      },
    });

    const fetchFn = vi.fn(async () => new Response(null, { status: 401 }));
    const tokenStore = new TokenStore();
    const githubClient = new GitHubClient(
      {
        getToken: async () => null,
        getAuthState: async () => null,
        isAuthenticated: async () => false,
      },
      fetchFn,
    );

    const authHandlers = createAuthHandlers(
      new GetAuthStateUseCase(tokenStore),
      new ValidateGitHubTokenUseCase(githubClient, tokenStore),
      new DisconnectGitHubUseCase(tokenStore),
      vi.fn(),
    );

    const response = await authHandlers.handleValidateGitHubToken(
      "github_pat_secret",
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(AuthErrorCode.INVALID_TOKEN);
    expect(JSON.stringify(response)).not.toContain("github_pat_secret");
    expect(await tokenStore.getToken()).toBeNull();
  });
});
