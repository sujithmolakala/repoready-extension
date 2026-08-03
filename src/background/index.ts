import { RepoStateStore } from "../application/repo-state-store";
import {
  MessageType,
  isExtensionMessage,
  type GetRepoStateResponse,
  type RepoStateUpdatedMessage,
} from "../shared/messages";

console.info("[RepoReady] Background service worker started");

const repoStateStore = new RepoStateStore();

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

function notifySidePanel(repository: GetRepoStateResponse["repository"]): void {
  const message: RepoStateUpdatedMessage = {
    type: MessageType.REPO_STATE_UPDATED,
    payload: { repository },
  };

  void chrome.runtime.sendMessage(message).catch(() => {
    // Side panel may not be open yet.
  });
}

async function getActiveTabRepository(): Promise<GetRepoStateResponse["repository"]> {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const tabId = tabs.at(0)?.id;

  if (tabId === undefined) {
    return null;
  }

  return repoStateStore.get(tabId);
}

async function notifySidePanelForActiveTab(): Promise<void> {
  const repository = await getActiveTabRepository();
  notifySidePanel(repository);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionMessage(message)) {
    return false;
  }

  if (message.type === MessageType.REPO_DETECTED) {
    const tabId = sender.tab?.id;

    if (tabId !== undefined) {
      repoStateStore.set(tabId, message.payload.repository);
      void notifySidePanelForActiveTab();
    }

    return false;
  }

  if (message.type === MessageType.GET_REPO_STATE) {
    void getActiveTabRepository().then((repository) => {
      const response: GetRepoStateResponse = { repository };
      sendResponse(response);
    });

    return true;
  }

  return false;
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  notifySidePanel(repoStateStore.get(tabId));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  repoStateStore.delete(tabId);
});
