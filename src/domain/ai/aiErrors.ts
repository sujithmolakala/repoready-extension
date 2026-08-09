export const AIErrorCode = {
  MISSING_API_KEY: "MISSING_API_KEY",
  MALFORMED_API_KEY: "MALFORMED_API_KEY",
  INVALID_API_KEY: "INVALID_API_KEY",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  NETWORK_ERROR: "NETWORK_ERROR",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  EMPTY_OUTPUT: "EMPTY_OUTPUT",
} as const;

export type AIErrorCode = (typeof AIErrorCode)[keyof typeof AIErrorCode];

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly retryAfter: number | undefined;

  constructor(code: AIErrorCode, message: string, retryAfter?: number) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export class AIAuthenticationError extends AIError {
  constructor(message: string) {
    super(AIErrorCode.INVALID_API_KEY, message);
    this.name = "AIAuthenticationError";
  }
}

export class AIRateLimitError extends AIError {
  constructor(message: string, retryAfter?: number) {
    super(AIErrorCode.RATE_LIMITED, message, retryAfter);
    this.name = "AIRateLimitError";
  }
}

export class AIQuotaError extends AIError {
  constructor(message: string) {
    super(AIErrorCode.QUOTA_EXCEEDED, message);
    this.name = "AIQuotaError";
  }
}

export class AINetworkError extends AIError {
  constructor(message: string) {
    super(AIErrorCode.NETWORK_ERROR, message);
    this.name = "AINetworkError";
  }
}

export class AIProviderUnavailableError extends AIError {
  constructor(message: string) {
    super(AIErrorCode.PROVIDER_UNAVAILABLE, message);
    this.name = "AIProviderUnavailableError";
  }
}

export class AIInvalidResponseError extends AIError {
  constructor(message: string) {
    super(AIErrorCode.INVALID_RESPONSE, message);
    this.name = "AIInvalidResponseError";
  }
}

export interface AIErrorPayload {
  code: AIErrorCode;
  message: string;
  retryAfter?: number;
}

export function aiErrorToPayload(error: AIError): AIErrorPayload {
  return {
    code: error.code,
    message: error.message,
    retryAfter: error.retryAfter,
  };
}
