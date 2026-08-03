export const AuthErrorCode = {
  MISSING_TOKEN: "MISSING_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RATE_LIMITED: "RATE_LIMITED",
  API_UNAVAILABLE: "API_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  MALFORMED_RESPONSE: "MALFORMED_RESPONSE",
} as const;

export type AuthErrorCode =
  (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly retryAfter: number | undefined;

  constructor(
    code: AuthErrorCode,
    message: string,
    retryAfter?: number,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export interface AuthErrorPayload {
  code: AuthErrorCode;
  message: string;
  retryAfter?: number;
}

export function authErrorToPayload(error: AuthError): AuthErrorPayload {
  return {
    code: error.code,
    message: error.message,
    retryAfter: error.retryAfter,
  };
}
