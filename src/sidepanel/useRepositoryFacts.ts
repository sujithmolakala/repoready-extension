import { useEffect, useState } from "react";

import type { RepositoryFactsState } from "../domain/models/repositoryFacts";
import { emptyRepositoryFactsState } from "../domain/models/repositoryFacts";
import {
  formatRepositoryFactsForDebug,
  type DebugRepositoryFactsView,
} from "../shared/format-facts-debug";
import {
  MessageType,
  isExtensionMessage,
  isGetRepositoryFactsResponse,
} from "../shared/messages";

export function useRepositoryFacts(): RepositoryFactsState & {
  debugFacts: DebugRepositoryFactsView | null;
} {
  const [factsState, setFactsState] = useState<RepositoryFactsState>(
    emptyRepositoryFactsState,
  );

  useEffect(() => {
    let isMounted = true;

    const loadFacts = async (): Promise<void> => {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.GET_REPOSITORY_FACTS,
      });

      if (!isMounted) {
        return;
      }

      setFactsState(
        isGetRepositoryFactsResponse(response)
          ? response.factsState
          : emptyRepositoryFactsState,
      );
    };

    void loadFacts();

    const onMessage = (message: unknown): void => {
      if (!isExtensionMessage(message)) {
        return;
      }

      if (message.type === MessageType.REPOSITORY_FACTS_UPDATED) {
        setFactsState(message.payload.factsState);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return {
    ...factsState,
    debugFacts:
      factsState.facts === null
        ? null
        : formatRepositoryFactsForDebug(factsState.facts),
  };
}
