import { AuthError, AuthErrorCode } from "../../domain/errors";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_ACCEPT = "application/vnd.github+json";

export type FetchFn = typeof fetch;

export interface GitHubRequestOptions {
  allowNotFound?: boolean;
}

export async function githubFetch(
  fetchFn: FetchFn,
  token: string,
  path: string,
): Promise<Response> {
  try {
    return await fetchFn(`${GITHUB_API_BASE}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: GITHUB_ACCEPT,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
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
  options: GitHubRequestOptions = {},
): Promise<unknown> {
  const response = await githubFetch(fetchFn, token, path);

  if (response.status === 404 && options.allowNotFound) {
    return null;
  }

  const statusError = mapHttpStatusError(response);

  if (statusError !== null) {
    throw statusError;
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

function mapHttpStatusError(response: Response): AuthError | null {
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

  if (response.status !== 200) {
    return new AuthError(
      AuthErrorCode.API_UNAVAILABLE,
      "GitHub returned an unexpected response. Try again later.",
    );
  }

  return null;
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
