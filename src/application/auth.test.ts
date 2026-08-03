import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidateGitHubTokenUseCase } from "./ValidateGitHubTokenUseCase";
import { DisconnectGitHubUseCase } from "./DisconnectGitHubUseCase";
import { AuthError, AuthErrorCode } from "../domain/errors";
import { GitHubClient } from "../infrastructure/github/GitHubClient";
import { TokenStore } from "../infrastructure/storage/TokenStore";

describe("ValidateGitHubTokenUseCase", () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();

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
    });
  });

  it("returns sanitized authenticated state for a valid token", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        login: "octocat",
        avatar_url: "https://github.com/avatar.png",
      }),
    );

    const tokenStore = new TokenStore();
    const githubClient = new GitHubClient(
      {
        getToken: async () => null,
        getAuthState: async () => null,
        isAuthenticated: async () => false,
      },
      fetchFn,
    );
    const useCase = new ValidateGitHubTokenUseCase(githubClient, tokenStore);

    const authState = await useCase.execute("github_pat_valid");

    expect(authState).toEqual({
      authenticated: true,
      username: "octocat",
      avatarUrl: "https://github.com/avatar.png",
      validatedAt: expect.any(String) as string,
    });
    expect(authState).not.toHaveProperty("token");
    expect(await tokenStore.getToken()).toBe("github_pat_valid");
  });

  it("maps invalid tokens to INVALID_TOKEN", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(null, { status: 401 }),
    );

    const tokenStore = new TokenStore();
    const githubClient = new GitHubClient(
      {
        getToken: async () => null,
        getAuthState: async () => null,
        isAuthenticated: async () => false,
      },
      fetchFn,
    );
    const useCase = new ValidateGitHubTokenUseCase(githubClient, tokenStore);

    await expect(useCase.execute("github_pat_invalid")).rejects.toMatchObject({
      code: AuthErrorCode.INVALID_TOKEN,
    });
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });

    const tokenStore = new TokenStore();
    const githubClient = new GitHubClient(
      {
        getToken: async () => null,
        getAuthState: async () => null,
        isAuthenticated: async () => false,
      },
      fetchFn,
    );
    const useCase = new ValidateGitHubTokenUseCase(githubClient, tokenStore);

    await expect(useCase.execute("github_pat_offline")).rejects.toMatchObject({
      code: AuthErrorCode.NETWORK_ERROR,
    });
  });
});

describe("DisconnectGitHubUseCase", () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();

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
    });
  });

  it("removes token and derived auth state", async () => {
    const tokenStore = new TokenStore();
    const useCase = new DisconnectGitHubUseCase(tokenStore);

    await tokenStore.setToken("github_pat_example");
    await tokenStore.setAuthState({
      authenticated: true,
      username: "octocat",
      avatarUrl: null,
      validatedAt: new Date().toISOString(),
    });

    await useCase.execute();

    expect(await tokenStore.getToken()).toBeNull();
    expect(await tokenStore.getAuthState()).toBeNull();
  });
});

describe("GitHubClient errors", () => {
  it("throws AuthError instances for typed failures", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(null, { status: 401 }),
    );

    const githubClient = new GitHubClient(
      {
        getToken: async () => "github_pat_invalid",
        getAuthState: async () => null,
        isAuthenticated: async () => true,
      },
      fetchFn,
    );

    await expect(githubClient.getCurrentUser()).rejects.toBeInstanceOf(AuthError);
  });
});
