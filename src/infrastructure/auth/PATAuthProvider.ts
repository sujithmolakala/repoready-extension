import type { AuthProvider } from "./AuthProvider";
import type { StoredAuthState } from "../../domain/auth";
import { TokenStore } from "../storage/TokenStore";

export class PATAuthProvider implements AuthProvider {
  constructor(private readonly tokenStore: TokenStore) {}

  getToken(): Promise<string | null> {
    return this.tokenStore.getToken();
  }

  getAuthState(): Promise<StoredAuthState | null> {
    return this.tokenStore.getAuthState();
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.tokenStore.getToken();
    const authState = await this.tokenStore.getAuthState();

    return token !== null && authState?.authenticated === true;
  }
}
