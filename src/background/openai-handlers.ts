import { DisconnectOpenAIUseCase } from "../application/DisconnectOpenAIUseCase";
import { GenerateDocumentWithAIUseCase } from "../application/GenerateDocumentWithAIUseCase";
import { GetOpenAIConfigUseCase } from "../application/GetOpenAIConfigUseCase";
import { ValidateOpenAIKeyUseCase } from "../application/ValidateOpenAIKeyUseCase";
import { toSanitizedOpenAIConfig } from "../domain/ai/aiConfig";
import { AIError, AIErrorCode, aiErrorToPayload } from "../domain/ai/aiErrors";
import {
  MessageType,
  type DisconnectOpenAIResponse,
  type GenerateDocumentWithAIResponse,
  type GetOpenAIConfigResponse,
  type OpenAIConfigUpdatedMessage,
  type ValidateOpenAIKeyResponse,
} from "../shared/messages";

export function createOpenAIHandlers(
  getOpenAIConfigUseCase: GetOpenAIConfigUseCase,
  validateOpenAIKeyUseCase: ValidateOpenAIKeyUseCase,
  disconnectOpenAIUseCase: DisconnectOpenAIUseCase,
  generateDocumentWithAIUseCase: GenerateDocumentWithAIUseCase,
  broadcastOpenAIConfig: (config: GetOpenAIConfigResponse["openAIConfig"]) => void,
) {
  async function handleGetOpenAIConfig(): Promise<GetOpenAIConfigResponse> {
    const openAIConfig = await getOpenAIConfigUseCase.execute();
    return { openAIConfig };
  }

  async function handleValidateOpenAIKey(
    apiKey: string,
  ): Promise<ValidateOpenAIKeyResponse> {
    try {
      const storedConfig = await validateOpenAIKeyUseCase.execute(apiKey);
      const openAIConfig = toSanitizedOpenAIConfig(storedConfig);

      broadcastOpenAIConfig(openAIConfig);

      return {
        success: true,
        openAIConfig,
      };
    } catch (error) {
      if (error instanceof AIError) {
        return {
          success: false,
          error: aiErrorToPayload(error),
        };
      }

      return {
        success: false,
        error: {
          code: AIErrorCode.PROVIDER_UNAVAILABLE,
          message: "OpenAI returned an unexpected response. Try again later.",
        },
      };
    }
  }

  async function handleDisconnectOpenAI(): Promise<DisconnectOpenAIResponse> {
    await disconnectOpenAIUseCase.execute();
    const openAIConfig = await getOpenAIConfigUseCase.execute();

    broadcastOpenAIConfig(openAIConfig);

    return { success: true };
  }

  async function handleGenerateDocumentWithAI(
    payload: import("../shared/messages").GenerateDocumentWithAIPayload,
  ): Promise<GenerateDocumentWithAIResponse> {
    try {
      const draft = await generateDocumentWithAIUseCase.execute({
        owner: payload.owner,
        repo: payload.repo,
        documentType: payload.documentType,
        facts: payload.facts,
        userInstructions: payload.userInstructions,
      });

      return {
        success: true,
        draft,
      };
    } catch (error) {
      if (error instanceof AIError) {
        return {
          success: false,
          error: aiErrorToPayload(error),
        };
      }

      return {
        success: false,
        error: {
          code: AIErrorCode.PROVIDER_UNAVAILABLE,
          message: "OpenAI returned an unexpected response. Try again later.",
        },
      };
    }
  }

  return {
    handleGetOpenAIConfig,
    handleValidateOpenAIKey,
    handleDisconnectOpenAI,
    handleGenerateDocumentWithAI,
  };
}

export function createOpenAIConfigBroadcaster() {
  return (openAIConfig: GetOpenAIConfigResponse["openAIConfig"]): void => {
    const message: OpenAIConfigUpdatedMessage = {
      type: MessageType.OPENAI_CONFIG_UPDATED,
      payload: { openAIConfig },
    };

    void chrome.runtime.sendMessage(message).catch(() => {
      // Options or side panel may not be open.
    });
  };
}
