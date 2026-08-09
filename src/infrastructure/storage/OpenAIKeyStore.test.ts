import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenAIKeyStore } from "./OpenAIKeyStore";

describe("OpenAIKeyStore", () => {
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

  it("stores and retrieves the API key from chrome.storage.local only", async () => {
    const keyStore = new OpenAIKeyStore();

    await keyStore.setApiKey("sk-test-key");

    expect(await keyStore.getApiKey()).toBe("sk-test-key");
    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  it("removes the API key and config on disconnect", async () => {
    const keyStore = new OpenAIKeyStore();

    await keyStore.setApiKey("sk-test-key");
    await keyStore.setConfig({
      provider: "openai",
      validatedAt: new Date().toISOString(),
    });

    await keyStore.clearAll();

    expect(await keyStore.getApiKey()).toBeNull();
    expect(await keyStore.getConfig()).toBeNull();
  });
});
