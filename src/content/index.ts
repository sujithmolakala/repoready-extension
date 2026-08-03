import { parseGitHubRepositoryUrl } from "../domain/github-url-parser";
import { MessageType, type RepoDetectedMessage } from "../shared/messages";

import { onLocationChange } from "./navigation-watcher";

function detectAndReportRepository(): void {
  const repository = parseGitHubRepositoryUrl(window.location.href);

  const message: RepoDetectedMessage = {
    type: MessageType.REPO_DETECTED,
    payload: {
      url: window.location.href,
      repository,
    },
  };

  void chrome.runtime.sendMessage(message);
}

console.info("[RepoReady] Content script loaded on GitHub:", window.location.href);

detectAndReportRepository();
onLocationChange(detectAndReportRepository);
