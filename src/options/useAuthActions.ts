import { useCallback, useState } from "react";

import { AuthErrorCode, type AuthErrorPayload } from "../domain/errors";
import type { SanitizedAuthState } from "../domain/auth";
import {
  MessageType,
  isDisconnectGitHubResponse,
  isValidateGitHubTokenResponse,
} from "../shared/messages";

interface AuthActionsState {
  isValidating: boolean;
  error: AuthErrorPayload | null;
  connectGitHub: (token: string) => Promise<SanitizedAuthState | null>;
  disconnectGitHub: () => Promise<void>;
  clearError: () => void;
}

export function useAuthActions(): AuthActionsState {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<AuthErrorPayload | null>(null);

  const connectGitHub = useCallback(async (token: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.VALIDATE_GITHUB_TOKEN,
        payload: { token },
      });

      if (!isValidateGitHubTokenResponse(response)) {
        setError({
          code: AuthErrorCode.API_UNAVAILABLE,
          message: "GitHub returned an unexpected response. Try again later.",
        });

        return null;
      }

      if (!response.success || response.authState === undefined) {
        setError(
          response.error ?? {
            code: AuthErrorCode.API_UNAVAILABLE,
            message: "GitHub returned an unexpected response. Try again later.",
          },
        );

        return null;
      }

      return response.authState;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const disconnectGitHub = useCallback(async () => {
    setError(null);

    const response: unknown = await chrome.runtime.sendMessage({
      type: MessageType.DISCONNECT_GITHUB,
    });

    if (!isDisconnectGitHubResponse(response) || !response.success) {
      setError({
        code: AuthErrorCode.API_UNAVAILABLE,
        message: "Could not disconnect GitHub. Try again.",
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isValidating,
    error,
    connectGitHub,
    disconnectGitHub,
    clearError,
  };
}
