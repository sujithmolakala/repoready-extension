import { OpenAIKeyStore } from "../infrastructure/storage/OpenAIKeyStore";

export class DisconnectOpenAIUseCase {
  constructor(private readonly openAIKeyStore: OpenAIKeyStore) {}

  async execute(): Promise<void> {
    await this.openAIKeyStore.clearAll();
  }
}
