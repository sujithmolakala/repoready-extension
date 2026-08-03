import type { StoredAuthState } from "../../domain/auth";

export interface AuthProvider {
  getToken(): Promise<string | null>;
  getAuthState(): Promise<StoredAuthState | null>;
  isAuthenticated(): Promise<boolean>;
}
