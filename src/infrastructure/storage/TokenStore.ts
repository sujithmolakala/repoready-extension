import type { StoredAuthState } from "../../domain/auth";

const TOKEN_KEY = "github_pat";
const AUTH_STATE_KEY = "auth_state";

export class TokenStore {
  async getToken(): Promise<string | null> {
    const result = await chrome.storage.local.get(TOKEN_KEY);
    const token = result[TOKEN_KEY];

    return typeof token === "string" && token.length > 0 ? token : null;
  }

  async setToken(token: string): Promise<void> {
    await chrome.storage.local.set({ [TOKEN_KEY]: token });
  }

  async getAuthState(): Promise<StoredAuthState | null> {
    const result = await chrome.storage.local.get(AUTH_STATE_KEY);
    const authState = result[AUTH_STATE_KEY];

    if (!isStoredAuthState(authState)) {
      return null;
    }

    return authState;
  }

  async setAuthState(authState: StoredAuthState): Promise<void> {
    await chrome.storage.local.set({ [AUTH_STATE_KEY]: authState });
  }

  async clearToken(): Promise<void> {
    await chrome.storage.local.remove(TOKEN_KEY);
  }

  async clearAuthState(): Promise<void> {
    await chrome.storage.local.remove(AUTH_STATE_KEY);
  }

  async clearAll(): Promise<void> {
    await chrome.storage.local.remove([TOKEN_KEY, AUTH_STATE_KEY]);
  }
}

function isStoredAuthState(value: unknown): value is StoredAuthState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    state.authenticated === true &&
    typeof state.username === "string" &&
    (typeof state.avatarUrl === "string" || state.avatarUrl === null) &&
    typeof state.validatedAt === "string"
  );
}
