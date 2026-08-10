import { beforeEach, describe, expect, it, vi } from "vitest";

import { TabUiStateStore } from "./TabUiStateStore";
import {
  createEmptyRepositoryUiState,
  SIDE_PANEL_OPEN_TABS_SESSION_KEY,
} from "../../shared/models/tabUiState";

function createSessionStorageMock() {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn(async (keys: string | string[] | null) => {
      if (keys === null) {
        return Object.fromEntries(store.entries());
      }

      if (Array.isArray(keys)) {
        return Object.fromEntries(
          keys
            .filter((key) => store.has(key))
            .map((key) => [key, store.get(key)]),
        );
      }

      return store.has(keys) ? { [keys]: store.get(keys) } : {};
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];

      for (const key of list) {
        store.delete(key);
      }
    }),
    store,
  };
}

describe("TabUiStateStore", () => {
  beforeEach(() => {
    const session = createSessionStorageMock();
    vi.stubGlobal("chrome", {
      storage: {
        session,
      },
    });
  });

  it("stores repository UI state without repository facts", async () => {
    const store = new TabUiStateStore();
    const state = {
      ...createEmptyRepositoryUiState(),
      scrollTop: 240,
      expandedCategoryIds: ["testing"],
    };

    await store.saveRepositoryUiState(1, "acme/demo", state);
    const loaded = await store.loadRepositoryUiState(1, "acme/demo");

    expect(loaded.scrollTop).toBe(240);
    expect(loaded.expandedCategoryIds).toEqual(["testing"]);
    expect(JSON.stringify(loaded)).not.toContain("dependencyFiles");
  });

  it("clears tab UI state when tab closes", async () => {
    const store = new TabUiStateStore();
    await store.saveRepositoryUiState(3, "acme/demo", {
      ...createEmptyRepositoryUiState(),
      scrollTop: 99,
    });

    await store.clearTabUiState(2);

    expect((await store.loadRepositoryUiState(2, "acme/demo")).scrollTop).toBe(0);
    expect((await store.loadRepositoryUiState(3, "acme/demo")).scrollTop).toBe(99);
  });

  it("tracks opened side panel tabs in session storage", async () => {
    const session = createSessionStorageMock();
    vi.stubGlobal("chrome", {
      storage: { session },
    });
    const store = new TabUiStateStore();

    await store.markTabOpened(10);
    await store.markTabOpened(11);

    expect(await store.getOpenedTabIds()).toEqual([10, 11]);

    await store.unmarkTabOpened(10);

    expect(await store.getOpenedTabIds()).toEqual([11]);
    expect(session.store.get(SIDE_PANEL_OPEN_TABS_SESSION_KEY)).toEqual([11]);
  });
});
