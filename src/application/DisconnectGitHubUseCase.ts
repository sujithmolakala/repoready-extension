import { TokenStore } from "../infrastructure/storage/TokenStore";

export class DisconnectGitHubUseCase {
  constructor(private readonly tokenStore: TokenStore) {}

  async execute(): Promise<void> {
    await this.tokenStore.clearAll();
  }
}
