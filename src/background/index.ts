import { RepoStateStore } from "../application/repo-state-store";
import { CollectRepositoryFactsUseCase } from "../application/CollectRepositoryFactsUseCase";
import { DisconnectGitHubUseCase } from "../application/DisconnectGitHubUseCase";
import { GetAuthStateUseCase } from "../application/GetAuthStateUseCase";
import { RepositoryFactsStore } from "../application/repository-facts-store";
import { ValidateGitHubTokenUseCase } from "../application/ValidateGitHubTokenUseCase";
import { AuthErrorCode } from "../domain/errors";
import { PATAuthProvider } from "../infrastructure/auth/PATAuthProvider";
import { FactCollector } from "../infrastructure/github/FactCollector";
import { GitHubClient } from "../infrastructure/github/GitHubClient";
import { TokenStore } from "../infrastructure/storage/TokenStore";
import {
  MessageType,
  isExtensionMessage,
  type GetRepoStateResponse,
  type RepoStateUpdatedMessage,
} from "../shared/messages";

import {
  createAuthHandlers,
  createAuthStateBroadcaster,
} from "./auth-handlers";
import {
  createRepositoryFactsBroadcaster,
  createRepositoryFactsHandlers,
} from "./repository-facts-handlers";

console.info("[RepoReady] Background service worker started");

const repoStateStore = new RepoStateStore();
const repositoryFactsStore = new RepositoryFactsStore();
const tokenStore = new TokenStore();
const authProvider = new PATAuthProvider(tokenStore);
const githubClient = new GitHubClient(authProvider);
const factCollector = new FactCollector(githubClient);
const getAuthStateUseCase = new GetAuthStateUseCase(tokenStore);
const validateGitHubTokenUseCase = new ValidateGitHubTokenUseCase(
  githubClient,
  tokenStore,
);
const disconnectGitHubUseCase = new DisconnectGitHubUseCase(tokenStore);
const collectRepositoryFactsUseCase = new CollectRepositoryFactsUseCase(
  factCollector,
  authProvider,
);
const broadcastAuthState = createAuthStateBroadcaster();
const broadcastRepositoryFacts = createRepositoryFactsBroadcaster();
const authHandlers = createAuthHandlers(
  getAuthStateUseCase,
  validateGitHubTokenUseCase,
  disconnectGitHubUseCase,
  broadcastAuthState,
);
const repositoryFactsHandlers = createRepositoryFactsHandlers(
  collectRepositoryFactsUseCase,
  repositoryFactsStore,
  broadcastRepositoryFacts,
);

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

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs.at(0);
}

async function getActiveTabRepository(): Promise<GetRepoStateResponse["repository"]> {
  const activeTab = await getActiveTab();

  if (activeTab?.id === undefined) {
    return null;
  }

  return repoStateStore.get(activeTab.id);
}

async function notifySidePanelForActiveTab(): Promise<void> {
  const repository = await getActiveTabRepository();
  notifySidePanel(repository);
}

async function collectFactsForActiveTab(): Promise<void> {
  const activeTab = await getActiveTab();

  if (activeTab?.id === undefined) {
    return;
  }

  const repository = repoStateStore.get(activeTab.id);
  await repositoryFactsHandlers.collectForTab(activeTab.id, repository);
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
      void repositoryFactsHandlers.collectForTab(
        tabId,
        message.payload.repository,
      );
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

  if (message.type === MessageType.GET_REPOSITORY_FACTS) {
    void getActiveTab().then((activeTab) => {
      sendResponse(
        repositoryFactsHandlers.handleGetRepositoryFacts(activeTab?.id),
      );
    });

    return true;
  }

  if (message.type === MessageType.GET_AUTH_STATE) {
    void authHandlers.handleGetAuthState().then((response) => {
      sendResponse(response);
    });

    return true;
  }

  if (message.type === MessageType.VALIDATE_GITHUB_TOKEN) {
    console.info("[RepoReady Auth Diagnostic]", {
      phase: "validate-message-received",
      requestSent: false,
    });

    void authHandlers
      .handleValidateGitHubToken(message.payload.token)
      .then((response) => {
        console.info("[RepoReady Auth Diagnostic]", {
          phase: "validate-response-ready",
          requestSent: true,
          success: response.success,
          hasAuthState: response.authState !== undefined,
          hasError: response.error !== undefined,
          responseIncludesToken: "token" in response,
        });
        sendResponse(response);

        if (response.success) {
          void collectFactsForActiveTab();
        }
      })
      .catch((error: unknown) => {
        console.info("[RepoReady Auth Diagnostic]", {
          phase: "validate-handler-rejected",
          errorName: error instanceof Error ? error.name : typeof error,
        });

        sendResponse({
          success: false,
          error: {
            code: AuthErrorCode.API_UNAVAILABLE,
            message: "GitHub returned an unexpected response. Try again later.",
          },
        });
      });

    return true;
  }

  if (message.type === MessageType.DISCONNECT_GITHUB) {
    void authHandlers.handleDisconnectGitHub().then((response) => {
      sendResponse(response);
      void getActiveTab().then((activeTab) => {
        if (activeTab?.id !== undefined) {
          void repositoryFactsHandlers.collectForTab(activeTab.id, null);
        }
      });
    });

    return true;
  }

  return false;
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  notifySidePanel(repoStateStore.get(tabId));
  broadcastRepositoryFacts(repositoryFactsStore.get(tabId));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  repoStateStore.delete(tabId);
  repositoryFactsStore.clear(tabId);
});
