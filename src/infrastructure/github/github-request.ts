import { AuthError, AuthErrorCode } from "../../domain/errors";
import {
  GitHubWriteError,
  GitHubWriteErrorCode,
} from "../../domain/github/writeErrors";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_ACCEPT = "application/vnd.github+json";

export type FetchFn = typeof fetch;

export interface GitHubRequestOptions {
  allowNotFound?: boolean;
}

export type GitHubHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface GitHubJsonRequestOptions extends GitHubRequestOptions {
  method?: GitHubHttpMethod;
  body?: unknown;
  expectedStatuses?: readonly number[];
}

export async function githubFetch(
  fetchFn: FetchFn,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: GITHUB_ACCEPT,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };

  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    return await fetchFn(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new AuthError(
      AuthErrorCode.NETWORK_ERROR,
      "GitHub could not be reached. Check your connection and try again.",
    );
  }
}

export async function githubFetchJson(
  fetchFn: FetchFn,
  token: string,
  path: string,
  options: GitHubJsonRequestOptions = {},
): Promise<unknown> {
  const method = options.method ?? "GET";
  const response = await githubFetch(fetchFn, token, path, {
    method,
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 404 && options.allowNotFound) {
    return null;
  }

  const expectedStatuses = options.expectedStatuses ?? [200];
  const statusError = mapHttpStatusError(response, expectedStatuses);

  if (statusError !== null) {
    throw statusError;
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new AuthError(
      AuthErrorCode.MALFORMED_RESPONSE,
      "GitHub returned a malformed response.",
    );
  }
}

export async function githubWriteFetchJson(
  fetchFn: FetchFn,
  token: string,
  path: string,
  options: GitHubJsonRequestOptions = {},
): Promise<unknown> {
  const method = options.method ?? "GET";
  const response = await githubFetch(fetchFn, token, path, {
    method,
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 404 && options.allowNotFound) {
    return null;
  }

  const expectedStatuses = options.expectedStatuses ?? [200];
  const statusError = mapWriteHttpStatusError(response, expectedStatuses);

  if (statusError !== null) {
    throw statusError;
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new GitHubWriteError(
      GitHubWriteErrorCode.MALFORMED_RESPONSE,
      "GitHub returned a malformed response.",
    );
  }
}

function mapHttpStatusError(
  response: Response,
  expectedStatuses: readonly number[] = [200],
): AuthError | null {
  if (expectedStatuses.includes(response.status)) {
    return null;
  }

  if (response.status === 401) {
    return new AuthError(
      AuthErrorCode.INVALID_TOKEN,
      "This token is invalid or has expired.",
    );
  }

  if (isRateLimited(response)) {
    return new AuthError(
      AuthErrorCode.RATE_LIMITED,
      formatRateLimitMessage(response),
      getRetryAfterSeconds(response),
    );
  }

  if (response.status === 403) {
    return new AuthError(
      AuthErrorCode.INSUFFICIENT_PERMISSIONS,
      "This token does not have sufficient permissions or GitHub blocked the request.",
    );
  }

  if (response.status >= 500) {
    return new AuthError(
      AuthErrorCode.API_UNAVAILABLE,
      "GitHub is temporarily unavailable. Try again later.",
    );
  }

  return new AuthError(
    AuthErrorCode.API_UNAVAILABLE,
    "GitHub returned an unexpected response. Try again later.",
  );
}

function mapWriteHttpStatusError(
  response: Response,
  expectedStatuses: readonly number[] = [200],
): GitHubWriteError | null {
  if (expectedStatuses.includes(response.status)) {
    return null;
  }

  if (response.status === 401) {
    return new GitHubWriteError(
      GitHubWriteErrorCode.MISSING_TOKEN,
      "Connect GitHub with a token that can write to this repository.",
    );
  }

  if (isRateLimited(response)) {
    return new GitHubWriteError(
      GitHubWriteErrorCode.RATE_LIMITED,
      formatRateLimitMessage(response),
      getRetryAfterSeconds(response),
    );
  }

  if (response.status === 403) {
    return new GitHubWriteError(
      GitHubWriteErrorCode.INSUFFICIENT_PERMISSIONS,
      "This token does not have sufficient permissions to write to the repository.",
    );
  }

  if (response.status >= 500) {
    return new GitHubWriteError(
      GitHubWriteErrorCode.API_UNAVAILABLE,
      "GitHub is temporarily unavailable. Try again later.",
    );
  }

  return new GitHubWriteError(
    GitHubWriteErrorCode.API_UNAVAILABLE,
    "GitHub returned an unexpected response. Try again later.",
  );
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) {
    return true;
  }

  const remaining = response.headers.get("X-RateLimit-Remaining");

  return response.status === 403 && remaining === "0";
}

function getRetryAfterSeconds(response: Response): number | undefined {
  const retryAfterHeader = response.headers.get("Retry-After");

  if (retryAfterHeader !== null) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);

    if (!Number.isNaN(retryAfterSeconds)) {
      return retryAfterSeconds;
    }
  }

  const resetHeader = response.headers.get("X-RateLimit-Reset");

  if (resetHeader !== null) {
    const resetEpochSeconds = Number.parseInt(resetHeader, 10);

    if (!Number.isNaN(resetEpochSeconds)) {
      const secondsUntilReset = resetEpochSeconds - Math.floor(Date.now() / 1000);

      return secondsUntilReset > 0 ? secondsUntilReset : undefined;
    }
  }

  return undefined;
}

function formatRateLimitMessage(response: Response): string {
  const retryAfterSeconds = getRetryAfterSeconds(response);

  if (retryAfterSeconds === undefined) {
    return "GitHub rate limit reached. Try again later.";
  }

  const retryTime = new Date(Date.now() + retryAfterSeconds * 1000).toLocaleTimeString();

  return `GitHub rate limit reached. Try again after ${retryTime}.`;
}

export function decodeBase64Content(content: string): string {
  const normalized = content.replace(/\n/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
