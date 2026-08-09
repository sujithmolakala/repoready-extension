import { toSanitizedOpenAIConfig } from "../domain/ai/aiConfig";
import { OpenAIKeyStore } from "../infrastructure/storage/OpenAIKeyStore";

export class GetOpenAIConfigUseCase {
  constructor(private readonly openAIKeyStore: OpenAIKeyStore) {}

  async execute() {
    const config = await this.openAIKeyStore.getConfig();
    return toSanitizedOpenAIConfig(config);
  }
}
