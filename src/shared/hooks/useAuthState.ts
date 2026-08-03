import { useEffect, useState } from "react";

import type { SanitizedAuthState } from "../../domain/auth";
import { disconnectedAuthState } from "../../domain/auth";
import {
  MessageType,
  isExtensionMessage,
  isGetAuthStateResponse,
} from "../messages";

interface AuthStateResult {
  authState: SanitizedAuthState;
  isLoading: boolean;
}

export function useAuthState(): AuthStateResult {
  const [authState, setAuthState] = useState<SanitizedAuthState>(
    disconnectedAuthState,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAuthState = async (): Promise<void> => {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.GET_AUTH_STATE,
      });

      if (!isMounted) {
        return;
      }

      setAuthState(
        isGetAuthStateResponse(response)
          ? response.authState
          : disconnectedAuthState,
      );
      setIsLoading(false);
    };

    void loadAuthState();

    const onMessage = (message: unknown): void => {
      if (!isExtensionMessage(message)) {
        return;
      }

      if (message.type === MessageType.AUTH_STATE_UPDATED) {
        setAuthState(message.payload.authState);
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return { authState, isLoading };
}
