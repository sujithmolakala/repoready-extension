import { useEffect, useState } from "react";

import type { GitHubRepository } from "../domain/repository";
import {
  MessageType,
  isExtensionMessage,
  isGetRepoStateResponse,
} from "../shared/messages";

interface RepoState {
  repository: GitHubRepository | null;
  isLoading: boolean;
}

export function useRepoState(): RepoState {
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadRepository = async (): Promise<void> => {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.GET_REPO_STATE,
      });

      if (!isMounted) {
        return;
      }

      setRepository(
        isGetRepoStateResponse(response) ? response.repository : null,
      );
      setIsLoading(false);
    };

    void loadRepository();

    const onMessage = (message: unknown): void => {
      if (!isExtensionMessage(message)) {
        return;
      }

      if (message.type === MessageType.REPO_STATE_UPDATED) {
        setRepository(message.payload.repository);
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return { repository, isLoading };
}
