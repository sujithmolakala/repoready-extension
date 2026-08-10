import { describe, expect, it } from "vitest";

import {
  createEmptyRepositoryUiState,
  parseTabUiStorageKey,
  tabUiStorageKey,
} from "./tabUiState";

describe("tabUiState", () => {
  it("builds storage keys from tab and repository", () => {
    expect(tabUiStorageKey(12, "acme/demo")).toBe("tab-ui:12:acme/demo");
  });

  it("parses storage keys", () => {
    expect(parseTabUiStorageKey("tab-ui:12:acme/demo")).toEqual({
      tabId: 12,
      repositoryKey: "acme/demo",
    });
  });

  it("creates empty repository UI state without secrets", () => {
    const state = createEmptyRepositoryUiState();

    expect(state.scrollTop).toBe(0);
    expect(state.selectedDocumentType).toBeNull();
    expect(JSON.stringify(state)).not.toContain("token");
    expect(JSON.stringify(state)).not.toContain("apiKey");
  });
});
