import {
  AuthError,
  AuthErrorCode,
} from "../../domain/errors";
import type { AuthProvider } from "../auth/AuthProvider";
import {
  getLoginType,
  getTopLevelFieldNames,
  logGitHubAuthDiagnostic,
} from "./github-auth-diagnostics";
import type { GitHubUser } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

const REQUIRED_HEADERS = {
  authorization: "Bearer <redacted>",
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
} as const;

export type FetchFn = typeof fetch;

export class GitHubClient {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly fetchFn: FetchFn = fetch.bind(globalThis),
  ) {}

  async getCurrentUser(): Promise<GitHubUser> {
    const token = await this.authProvider.getToken();

    if (token === null) {
      throw new AuthError(
        AuthErrorCode.MISSING_TOKEN,
        "No GitHub token is stored.",
      );
    }

    return this.fetchCurrentUser(token);
  }

  async validateToken(token: string): Promise<GitHubUser> {
    const trimmedToken = token.trim();

    if (trimmedToken.length === 0) {
      throw new AuthError(
        AuthErrorCode.MISSING_TOKEN,
        "Enter a GitHub personal access token.",
      );
    }

    return this.fetchCurrentUser(trimmedToken);
  }

  private async fetchCurrentUser(token: string): Promise<GitHubUser> {
    logGitHubAuthDiagnostic({
      phase: "request-start",
      requestSent: false,
    });

    let response: Response;

    try {
      response = await this.fetchFn(`${GITHUB_API_BASE}/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch {
      logGitHubAuthDiagnostic({
        phase: "network-error",
        requestSent: true,
        mappedErrorCode: AuthErrorCode.NETWORK_ERROR,
      });

      throw new AuthError(
        AuthErrorCode.NETWORK_ERROR,
        "GitHub could not be reached. Check your connection and try again.",
      );
    }

    logGitHubAuthDiagnostic({
      phase: "response-received",
      requestSent: true,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      loginExists: undefined,
      loginType: undefined,
    });

    console.info("[RepoReady Auth Diagnostic] request-headers", {
      authorization: REQUIRED_HEADERS.authorization,
      accept: REQUIRED_HEADERS.accept,
      "x-github-api-version": REQUIRED_HEADERS["x-github-api-version"],
    });

    const statusError = mapHttpStatusError(response);

    if (statusError !== null) {
      logGitHubAuthDiagnostic({
        phase: "http-status-error",
        requestSent: true,
        httpStatus: response.status,
        contentType: response.headers.get("content-type"),
        mappedErrorCode: statusError.code,
      });

      throw statusError;
    }

    let body: unknown;
    let jsonParseSucceeded = false;

    try {
      body = await response.json();
      jsonParseSucceeded = true;
    } catch {
      logGitHubAuthDiagnostic({
        phase: "json-parse-error",
        requestSent: true,
        httpStatus: response.status,
        contentType: response.headers.get("content-type"),
        jsonParseSucceeded: false,
        mappedErrorCode: AuthErrorCode.MALFORMED_RESPONSE,
      });

      throw new AuthError(
        AuthErrorCode.MALFORMED_RESPONSE,
        "GitHub returned a malformed response.",
      );
    }

    const topLevelFieldNames = getTopLevelFieldNames(body);
    const loginType = getLoginType(body);

    logGitHubAuthDiagnostic({
      phase: "response-parsed",
      requestSent: true,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      jsonParseSucceeded,
      topLevelFieldNames,
      loginExists: loginType !== "missing",
      loginType,
    });

    try {
      return parseGitHubUser(body);
    } catch (error) {
      if (error instanceof AuthError) {
        logGitHubAuthDiagnostic({
          phase: "response-validation-error",
          requestSent: true,
          httpStatus: response.status,
          contentType: response.headers.get("content-type"),
          jsonParseSucceeded,
          topLevelFieldNames,
          loginExists: loginType !== "missing",
          loginType,
          mappedErrorCode: error.code,
        });
      }

      throw error;
    }
  }
}

export function parseGitHubUser(body: unknown): GitHubUser {
  if (typeof body !== "object" || body === null) {
    throw new AuthError(
      AuthErrorCode.MALFORMED_RESPONSE,
      "GitHub returned an unexpected response. Try again later.",
    );
  }

  const user = body as { login?: unknown; avatar_url?: unknown };

  if (typeof user.login !== "string" || user.login.length === 0) {
    throw new AuthError(
      AuthErrorCode.MALFORMED_RESPONSE,
      "GitHub returned an unexpected response. Try again later.",
    );
  }

  const avatarUrl =
    typeof user.avatar_url === "string" ? user.avatar_url : null;

  return {
    login: user.login,
    avatarUrl,
  };
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
