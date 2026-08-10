import { AnalyzeRepositoryUseCase } from "../application/AnalyzeRepositoryUseCase";
import { RepoStateStore } from "../application/repo-state-store";
import { DisconnectGitHubUseCase } from "../application/DisconnectGitHubUseCase";
import { DisconnectOpenAIUseCase } from "../application/DisconnectOpenAIUseCase";
import { EvaluateHealthUseCase } from "../application/EvaluateHealthUseCase";
import { PrepareWritePlanUseCase } from "../application/PrepareWritePlanUseCase";
import {
  CreatePullRequestUseCase,
  PrepareWritePlanApplicationUseCase,
} from "../application/CreatePullRequestUseCase";
import { GetAuthStateUseCase } from "../application/GetAuthStateUseCase";
import { GetOpenAIConfigUseCase } from "../application/GetOpenAIConfigUseCase";
import { HealthReportStore } from "../application/health-report-store";
import { RepositoryFactsStore } from "../application/repository-facts-store";
import { ValidateGitHubTokenUseCase } from "../application/ValidateGitHubTokenUseCase";
import { ValidateOpenAIKeyUseCase } from "../application/ValidateOpenAIKeyUseCase";
import { AuthErrorCode } from "../domain/errors";
import { AIErrorCode } from "../domain/ai/aiErrors";
import { GitHubWriteErrorCode } from "../domain/github/writeErrors";
import { PATAuthProvider } from "../infrastructure/auth/PATAuthProvider";
import { OpenAIProvider } from "../infrastructure/ai/OpenAIProvider";
import { GenerateDocumentWithAIUseCase } from "../application/GenerateDocumentWithAIUseCase";
import { GitHubWriterImpl } from "../infrastructure/github/GitHubWriterImpl";
import { FactCollector } from "../infrastructure/github/FactCollector";
import { GitHubClient } from "../infrastructure/github/GitHubClient";
import { OpenAIKeyStore } from "../infrastructure/storage/OpenAIKeyStore";
import { HealthScoreHistoryStore } from "../infrastructure/storage/HealthScoreHistoryStore";
import { RepositoryFactsCacheStore } from "../infrastructure/storage/RepositoryFactsCacheStore";
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
  createHealthReportBroadcaster,
  createHealthReportHandlers,
} from "./health-handlers";
import {
  createOpenAIConfigBroadcaster,
  createOpenAIHandlers,
} from "./openai-handlers";

import {
  createWriteHandlers,
} from "./write-handlers";

import {
  createRepositoryFactsBroadcaster,
  createRepositoryFactsHandlers,
} from "./repository-facts-handlers";
import { createBackgroundRefreshServices } from "./backgroundRefresh";
import { SidePanelControl, registerSidePanelControl } from "./sidePanelControl";
import { TabUiStateStore } from "../infrastructure/storage/TabUiStateStore";

console.info("[RepoReady] Background service worker started");

const repoStateStore = new RepoStateStore();
const repositoryFactsStore = new RepositoryFactsStore();
const healthReportStore = new HealthReportStore();
const tokenStore = new TokenStore();
const openAIKeyStore = new OpenAIKeyStore();
const authProvider = new PATAuthProvider(tokenStore);
const githubClient = new GitHubClient(authProvider);
const gitHubWriter = new GitHubWriterImpl(authProvider);
const factCollector = new FactCollector(githubClient);
const openAIProvider = new OpenAIProvider(() => openAIKeyStore.getApiKey());
const getAuthStateUseCase = new GetAuthStateUseCase(tokenStore);
const getOpenAIConfigUseCase = new GetOpenAIConfigUseCase(openAIKeyStore);
const validateGitHubTokenUseCase = new ValidateGitHubTokenUseCase(
  githubClient,
  tokenStore,
);
const validateOpenAIKeyUseCase = new ValidateOpenAIKeyUseCase(
  openAIKeyStore,
  openAIProvider,
);
const disconnectGitHubUseCase = new DisconnectGitHubUseCase(tokenStore);
const disconnectOpenAIUseCase = new DisconnectOpenAIUseCase(openAIKeyStore);
const generateDocumentWithAIUseCase = new GenerateDocumentWithAIUseCase(
  openAIProvider,
);
const prepareWritePlanUseCase = new PrepareWritePlanUseCase();
const prepareWritePlanApplicationUseCase = new PrepareWritePlanApplicationUseCase(
  prepareWritePlanUseCase,
  gitHubWriter,
);
const createPullRequestUseCase = new CreatePullRequestUseCase(gitHubWriter);
const repositoryFactsCacheStore = new RepositoryFactsCacheStore();
const healthScoreHistoryStore = new HealthScoreHistoryStore();
const collectRepositoryFactsUseCase = createBackgroundRefreshServices(
  authProvider,
  factCollector,
  githubClient,
  repositoryFactsCacheStore,
);
const evaluateHealthUseCase = new EvaluateHealthUseCase();
const analyzeRepositoryUseCase = new AnalyzeRepositoryUseCase(
  evaluateHealthUseCase,
  healthScoreHistoryStore,
);
const broadcastAuthState = createAuthStateBroadcaster();
const broadcastOpenAIConfig = createOpenAIConfigBroadcaster();
const broadcastRepositoryFacts = createRepositoryFactsBroadcaster();
const broadcastHealthReport = createHealthReportBroadcaster();
const healthReportHandlers = createHealthReportHandlers(
  analyzeRepositoryUseCase,
  healthReportStore,
  broadcastHealthReport,
);
const authHandlers = createAuthHandlers(
  getAuthStateUseCase,
  validateGitHubTokenUseCase,
  disconnectGitHubUseCase,
  broadcastAuthState,
);
const openAIHandlers = createOpenAIHandlers(
  getOpenAIConfigUseCase,
  validateOpenAIKeyUseCase,
  disconnectOpenAIUseCase,
  generateDocumentWithAIUseCase,
  broadcastOpenAIConfig,
);
const writeHandlers = createWriteHandlers(
  prepareWritePlanApplicationUseCase,
  createPullRequestUseCase,
);
const repositoryFactsHandlers = createRepositoryFactsHandlers(
  collectRepositoryFactsUseCase,
  repositoryFactsStore,
  broadcastRepositoryFacts,
  (tabId, facts, options) => healthReportHandlers.evaluateForTab(tabId, facts, options),
  (tabId) => {
    healthReportHandlers.clearForTab(tabId);
  },
);

const tabUiStateStore = new TabUiStateStore();
const sidePanelControl = new SidePanelControl(tabUiStateStore);
registerSidePanelControl(sidePanelControl);
void sidePanelControl.initialize();

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

  if (message.type === MessageType.GET_HEALTH_REPORT) {
    void getActiveTab().then((activeTab) => {
      sendResponse(healthReportHandlers.handleGetHealthReport(activeTab?.id));
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
          healthReportHandlers.clearForTab(activeTab.id);
        }
      });
    });

    return true;
  }

  if (message.type === MessageType.GET_OPENAI_CONFIG) {
    void openAIHandlers.handleGetOpenAIConfig().then((response) => {
      sendResponse(response);
    });

    return true;
  }

  if (message.type === MessageType.VALIDATE_OPENAI_KEY) {
    void openAIHandlers
      .handleValidateOpenAIKey(message.payload.apiKey)
      .then((response) => {
        sendResponse(response);
      })
      .catch(() => {
        sendResponse({
          success: false,
          error: {
            code: AIErrorCode.PROVIDER_UNAVAILABLE,
            message: "OpenAI returned an unexpected response. Try again later.",
          },
        });
      });

    return true;
  }

  if (message.type === MessageType.DISCONNECT_OPENAI) {
    void openAIHandlers.handleDisconnectOpenAI().then((response) => {
      sendResponse(response);
    });

    return true;
  }

  if (message.type === MessageType.GENERATE_DOCUMENT_WITH_AI) {
    void openAIHandlers
      .handleGenerateDocumentWithAI(message.payload)
      .then((response) => {
        sendResponse(response);
      })
      .catch(() => {
        sendResponse({
          success: false,
          error: {
            code: AIErrorCode.PROVIDER_UNAVAILABLE,
            message: "OpenAI returned an unexpected response. Try again later.",
          },
        });
      });

    return true;
  }

  if (message.type === MessageType.PREPARE_WRITE_PLAN) {
    void writeHandlers.handlePrepareWritePlan(message.payload).then((response) => {
      sendResponse(response);
    });

    return true;
  }

  if (message.type === MessageType.CREATE_PULL_REQUEST) {
    void writeHandlers
      .handleCreatePullRequest(message.payload)
      .then((response) => {
        sendResponse(response);
      })
      .catch(() => {
        sendResponse({
          success: false,
          error: {
            code: GitHubWriteErrorCode.API_UNAVAILABLE,
            message: "Could not create the pull request. Try again.",
          },
        });
      });

    return true;
  }

  if (message.type === MessageType.REFRESH_REPOSITORY_FACTS) {
    void getActiveTab().then((activeTab) => {
      if (activeTab?.id === undefined) {
        return;
      }

      const repository = repoStateStore.get(activeTab.id);
      void repositoryFactsHandlers.collectForTab(activeTab.id, repository, {
        forceRefresh: true,
        forceHistory: true,
      });
    });

    return false;
  }

  return false;
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  notifySidePanel(repoStateStore.get(tabId));
  broadcastRepositoryFacts(repositoryFactsStore.get(tabId));
  broadcastHealthReport(healthReportStore.get(tabId));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  repoStateStore.delete(tabId);
  repositoryFactsStore.clear(tabId);
  healthReportStore.clear(tabId);
  void sidePanelControl.handleTabRemoved(tabId);
});
