import type { SanitizedAuthState } from "../domain/auth";
import { toSanitizedAuthState } from "../domain/auth";
import { TokenStore } from "../infrastructure/storage/TokenStore";

export class GetAuthStateUseCase {
  constructor(private readonly tokenStore: TokenStore) {}

  async execute(): Promise<SanitizedAuthState> {
    const authState = await this.tokenStore.getAuthState();

    return toSanitizedAuthState(authState);
  }
}
