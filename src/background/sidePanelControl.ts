import { TabUiStateStore } from "../infrastructure/storage/TabUiStateStore";

export const SIDE_PANEL_PATH = "src/sidepanel/index.html";

export class SidePanelControl {
  constructor(private readonly tabUiStateStore: TabUiStateStore) {}

  async initialize(): Promise<void> {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

    const tabs = await chrome.tabs.query({});
    const openedTabIds = new Set(await this.tabUiStateStore.getOpenedTabIds());

    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id === undefined) {
          return;
        }

        await this.setTabSidePanelEnabled(tab.id, openedTabIds.has(tab.id));
      }),
    );
  }

  async handleActionClick(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id === undefined) {
      return;
    }

    await this.setTabSidePanelEnabled(tab.id, true);
    await this.tabUiStateStore.markTabOpened(tab.id);
    await chrome.sidePanel.open({ tabId: tab.id });
  }

  async handleTabCreated(tabId: number): Promise<void> {
    await this.setTabSidePanelEnabled(tabId, false);
  }

  async handleTabRemoved(tabId: number): Promise<void> {
    await this.tabUiStateStore.unmarkTabOpened(tabId);
    await this.tabUiStateStore.clearTabUiState(tabId);
  }

  async setTabSidePanelEnabled(tabId: number, enabled: boolean): Promise<void> {
    await chrome.sidePanel.setOptions({
      tabId,
      path: SIDE_PANEL_PATH,
      enabled,
    });
  }
}

export function registerSidePanelControl(sidePanelControl: SidePanelControl): void {
  chrome.runtime.onInstalled.addListener(() => {
    void sidePanelControl.initialize();
  });

  chrome.runtime.onStartup.addListener(() => {
    void sidePanelControl.initialize();
  });

  chrome.action.onClicked.addListener((tab) => {
    void sidePanelControl.handleActionClick(tab);
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id !== undefined) {
      void sidePanelControl.handleTabCreated(tab.id);
    }
  });
}
