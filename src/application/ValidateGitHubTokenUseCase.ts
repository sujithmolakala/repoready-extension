import type { StoredAuthState } from "../domain/auth";
import { GitHubClient } from "../infrastructure/github/GitHubClient";
import { TokenStore } from "../infrastructure/storage/TokenStore";

export class ValidateGitHubTokenUseCase {
  constructor(
    private readonly githubClient: GitHubClient,
    private readonly tokenStore: TokenStore,
  ) {}

  async execute(token: string): Promise<StoredAuthState> {
    const user = await this.githubClient.validateToken(token);

    await this.tokenStore.setToken(token.trim());
    const authState: StoredAuthState = {
      authenticated: true,
      username: user.login,
      avatarUrl: user.avatarUrl,
      validatedAt: new Date().toISOString(),
    };

    await this.tokenStore.setAuthState(authState);

    return authState;
  }
}
