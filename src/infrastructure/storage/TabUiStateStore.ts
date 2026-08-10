import {
  createEmptyRepositoryUiState,
  isRepositoryUiState,
  isTabUiStorageKey,
  parseTabUiStorageKey,
  SIDE_PANEL_OPEN_TABS_SESSION_KEY,
  tabUiStorageKey,
  type RepositoryUiState,
} from "../../shared/models/tabUiState";

export class TabUiStateStore {
  async loadRepositoryUiState(
    tabId: number,
    repositoryKey: string,
  ): Promise<RepositoryUiState> {
    const key = tabUiStorageKey(tabId, repositoryKey);
    const result = await chrome.storage.session.get(key);
    const value = result[key];

    if (!isRepositoryUiState(value)) {
      return createEmptyRepositoryUiState();
    }

    return value;
  }

  async saveRepositoryUiState(
    tabId: number,
    repositoryKey: string,
    state: RepositoryUiState,
  ): Promise<void> {
    const key = tabUiStorageKey(tabId, repositoryKey);
    await chrome.storage.session.set({ [key]: state });
  }

  async clearTabUiState(tabId: number): Promise<void> {
    const all = await chrome.storage.session.get(null);
    const keysToRemove = Object.keys(all).filter((key) => {
      const parsed = parseTabUiStorageKey(key);
      return parsed?.tabId === tabId;
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.session.remove(keysToRemove);
    }
  }

  async getOpenedTabIds(): Promise<number[]> {
    const result = await chrome.storage.session.get(SIDE_PANEL_OPEN_TABS_SESSION_KEY);
    const value = result[SIDE_PANEL_OPEN_TABS_SESSION_KEY];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry): entry is number => typeof entry === "number");
  }

  async markTabOpened(tabId: number): Promise<void> {
    const openedTabIds = await this.getOpenedTabIds();

    if (openedTabIds.includes(tabId)) {
      return;
    }

    await chrome.storage.session.set({
      [SIDE_PANEL_OPEN_TABS_SESSION_KEY]: [...openedTabIds, tabId],
    });
  }

  async unmarkTabOpened(tabId: number): Promise<void> {
    const openedTabIds = await this.getOpenedTabIds();
    const next = openedTabIds.filter((id) => id !== tabId);

    await chrome.storage.session.set({
      [SIDE_PANEL_OPEN_TABS_SESSION_KEY]: next,
    });
  }

  async listTabUiKeys(): Promise<string[]> {
    const all = await chrome.storage.session.get(null);
    return Object.keys(all).filter(isTabUiStorageKey);
  }
}
