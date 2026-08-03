export interface SanitizedAuthState {
  authenticated: boolean;
  username: string | null;
  avatarUrl: string | null;
  validatedAt: string | null;
}

export interface StoredAuthState {
  authenticated: boolean;
  username: string;
  avatarUrl: string | null;
  validatedAt: string;
}

export const disconnectedAuthState: SanitizedAuthState = {
  authenticated: false,
  username: null,
  avatarUrl: null,
  validatedAt: null,
};

export function toSanitizedAuthState(
  state: StoredAuthState | null,
): SanitizedAuthState {
  if (state === null) {
    return disconnectedAuthState;
  }

  return {
    authenticated: state.authenticated,
    username: state.username,
    avatarUrl: state.avatarUrl,
    validatedAt: state.validatedAt,
  };
}
