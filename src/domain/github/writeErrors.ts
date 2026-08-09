export const GitHubWriteErrorCode = {
  MISSING_TOKEN: "MISSING_TOKEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RATE_LIMITED: "RATE_LIMITED",
  NETWORK_ERROR: "NETWORK_ERROR",
  BRANCH_CREATION_FAILED: "BRANCH_CREATION_FAILED",
  COMMIT_FAILED: "COMMIT_FAILED",
  PULL_REQUEST_FAILED: "PULL_REQUEST_FAILED",
  CLEANUP_FAILED: "CLEANUP_FAILED",
  API_UNAVAILABLE: "API_UNAVAILABLE",
  MALFORMED_RESPONSE: "MALFORMED_RESPONSE",
} as const;

export type GitHubWriteErrorCode =
  (typeof GitHubWriteErrorCode)[keyof typeof GitHubWriteErrorCode];

export class GitHubWriteError extends Error {
  readonly code: GitHubWriteErrorCode;
  readonly retryAfter: number | undefined;

  constructor(
    code: GitHubWriteErrorCode,
    message: string,
    retryAfter?: number,
  ) {
    super(message);
    this.name = "GitHubWriteError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export interface GitHubWriteErrorPayload {
  code: GitHubWriteErrorCode;
  message: string;
  retryAfter?: number;
}

export function gitHubWriteErrorToPayload(
  error: GitHubWriteError,
): GitHubWriteErrorPayload {
  return {
    code: error.code,
    message: error.message,
    retryAfter: error.retryAfter,
  };
}
