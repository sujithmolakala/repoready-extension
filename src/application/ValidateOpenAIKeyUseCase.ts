import type { StoredOpenAIConfig } from "../domain/ai/aiConfig";
import { OpenAIProvider } from "../infrastructure/ai/OpenAIProvider";
import { OpenAIKeyStore } from "../infrastructure/storage/OpenAIKeyStore";

export class ValidateOpenAIKeyUseCase {
  constructor(
    private readonly openAIKeyStore: OpenAIKeyStore,
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  async execute(apiKey: string): Promise<StoredOpenAIConfig> {
    await this.openAIProvider.validateApiKey(apiKey);

    await this.openAIKeyStore.setApiKey(apiKey.trim());

    const config: StoredOpenAIConfig = {
      provider: "openai",
      validatedAt: new Date().toISOString(),
    };

    await this.openAIKeyStore.setConfig(config);

    return config;
  }
}
