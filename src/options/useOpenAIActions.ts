import { useCallback, useState } from "react";

import { AIErrorCode, type AIErrorPayload } from "../domain/ai/aiErrors";
import type { SanitizedOpenAIConfig } from "../domain/ai/aiConfig";
import {
  MessageType,
  isDisconnectOpenAIResponse,
  isValidateOpenAIKeyResponse,
} from "../shared/messages";

interface OpenAIActionsState {
  isValidating: boolean;
  error: AIErrorPayload | null;
  connectOpenAI: (apiKey: string) => Promise<SanitizedOpenAIConfig | null>;
  disconnectOpenAI: () => Promise<void>;
  clearError: () => void;
}

export function useOpenAIActions(): OpenAIActionsState {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<AIErrorPayload | null>(null);

  const connectOpenAI = useCallback(async (apiKey: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.VALIDATE_OPENAI_KEY,
        payload: { apiKey },
      });

      if (!isValidateOpenAIKeyResponse(response)) {
        setError({
          code: AIErrorCode.PROVIDER_UNAVAILABLE,
          message: "OpenAI returned an unexpected response. Try again later.",
        });

        return null;
      }

      if (!response.success || response.openAIConfig === undefined) {
        setError(
          response.error ?? {
            code: AIErrorCode.PROVIDER_UNAVAILABLE,
            message: "OpenAI returned an unexpected response. Try again later.",
          },
        );

        return null;
      }

      return response.openAIConfig;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const disconnectOpenAI = useCallback(async () => {
    setError(null);

    const response: unknown = await chrome.runtime.sendMessage({
      type: MessageType.DISCONNECT_OPENAI,
    });

    if (!isDisconnectOpenAIResponse(response) || !response.success) {
      setError({
        code: AIErrorCode.PROVIDER_UNAVAILABLE,
        message: "Could not disconnect OpenAI. Try again.",
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isValidating,
    error,
    connectOpenAI,
    disconnectOpenAI,
    clearError,
  };
}
