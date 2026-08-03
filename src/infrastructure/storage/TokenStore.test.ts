import { beforeEach, describe, expect, it, vi } from "vitest";

import { TokenStore } from "../storage/TokenStore";

describe("TokenStore", () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();

    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[] | Record<string, unknown>) => {
            if (typeof keys === "string") {
              return { [keys]: storage.get(keys) };
            }

            if (Array.isArray(keys)) {
              return Object.fromEntries(
                keys.map((key) => [key, storage.get(key)]),
              );
            }

            return {};
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
        sync: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn(),
        },
      },
    });
  });

  it("stores and retrieves the token from chrome.storage.local", async () => {
    const tokenStore = new TokenStore();

    await tokenStore.setToken("github_pat_example");

    expect(await tokenStore.getToken()).toBe("github_pat_example");
    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  it("clears token and derived auth state on disconnect", async () => {
    const tokenStore = new TokenStore();

    await tokenStore.setToken("github_pat_example");
    await tokenStore.setAuthState({
      authenticated: true,
      username: "octocat",
      avatarUrl: null,
      validatedAt: new Date().toISOString(),
    });

    await tokenStore.clearAll();

    expect(await tokenStore.getToken()).toBeNull();
    expect(await tokenStore.getAuthState()).toBeNull();
  });
});
