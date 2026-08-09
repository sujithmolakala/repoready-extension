import { useEffect, useState } from "react";

import { disconnectedOpenAIConfig } from "../../domain/ai/aiConfig";
import type { SanitizedOpenAIConfig } from "../../domain/ai/aiConfig";
import {
  MessageType,
  isExtensionMessage,
  isGetOpenAIConfigResponse,
} from "../messages";

interface OpenAIConfigResult {
  openAIConfig: SanitizedOpenAIConfig;
  isLoading: boolean;
}

export function useOpenAIConfig(): OpenAIConfigResult {
  const [openAIConfig, setOpenAIConfig] = useState<SanitizedOpenAIConfig>(
    disconnectedOpenAIConfig,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadOpenAIConfig = async (): Promise<void> => {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.GET_OPENAI_CONFIG,
      });

      if (!isMounted) {
        return;
      }

      setOpenAIConfig(
        isGetOpenAIConfigResponse(response)
          ? response.openAIConfig
          : disconnectedOpenAIConfig,
      );
      setIsLoading(false);
    };

    void loadOpenAIConfig();

    const onMessage = (message: unknown): void => {
      if (!isExtensionMessage(message)) {
        return;
      }

      if (message.type === MessageType.OPENAI_CONFIG_UPDATED) {
        setOpenAIConfig(message.payload.openAIConfig);
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return { openAIConfig, isLoading };
}
