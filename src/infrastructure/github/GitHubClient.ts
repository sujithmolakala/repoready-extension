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
import {
  decodeBase64Content,
  githubFetchJson,
  type FetchFn,
} from "./github-request";
import { logTreeCollectionDiagnostic } from "./tree-diagnostics";
import { parseTree } from "./tree-parser";
import type {
  GitHubBranchResponse,
  GitHubCommitResponse,
  GitHubContentResponse,
  GitHubReadmeResponse,
  GitHubRepositoryResponse,
  GitHubTreeResponse,
  GitHubUser,
} from "./types";

const REQUIRED_HEADERS = {
  authorization: "Bearer <redacted>",
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
} as const;

export type { FetchFn } from "./github-request";

export class GitHubClient {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly fetchFn: FetchFn = fetch.bind(globalThis),
  ) {}

  async getCurrentUser(): Promise<GitHubUser> {
    const token = await this.getTokenOrThrow();

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

  async getRepository(
    owner: string,
    name: string,
  ): Promise<GitHubRepositoryResponse> {
    const token = await this.getTokenOrThrow();
    const body = await githubFetchJson(
      this.fetchFn,
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    );

    return body as GitHubRepositoryResponse;
  }

  async getLanguages(
    owner: string,
    name: string,
  ): Promise<Record<string, number>> {
    const token = await this.getTokenOrThrow();
    const body = await githubFetchJson(
      this.fetchFn,
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`,
    );

    return parseLanguages(body);
  }

  async getDirectoryContents(
    owner: string,
    name: string,
    path: string,
  ): Promise<GitHubContentResponse[]> {
    const token = await this.getTokenOrThrow();
    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const body = await githubFetchJson(
      this.fetchFn,
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodedPath}`,
      { allowNotFound: true },
    );

    if (body === null) {
      return [];
    }

    if (Array.isArray(body)) {
      return body as GitHubContentResponse[];
    }

    return [body as GitHubContentResponse];
  }

  async getReadme(
    owner: string,
    name: string,
  ): Promise<{ path: string; content: string } | null> {
    const token = await this.getTokenOrThrow();
    const body = await githubFetchJson(
      this.fetchFn,
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
      { allowNotFound: true },
    );

    if (body === null) {
      return null;
    }

    return parseReadme(body as GitHubReadmeResponse);
  }

  async getFileContent(
    owner: string,
    name: string,
    path: string,
  ): Promise<{ path: string; content: string; size: number | null }> {
    const token = await this.getTokenOrThrow();
    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const body = await githubFetchJson(
      this.fetchFn,
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodedPath}`,
    );

    return parseContentFile(body as GitHubContentResponse);
  }

  async getRecursiveTree(
    owner: string,
    name: string,
    branch: string,
  ): Promise<{ paths: string[]; truncated: boolean }> {
    const token = await this.getTokenOrThrow();
    const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

    let branchBody: GitHubBranchResponse;

    try {
      branchBody = (await githubFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/branches/${encodeURIComponent(branch)}`,
      )) as GitHubBranchResponse;
    } catch (error) {
      logTreeCollectionDiagnostic({
        stage: "branch",
        errorCode: readErrorCode(error),
        message: readErrorMessage(error),
      });
      throw error;
    }

    const commitSha =
      typeof branchBody.commit?.sha === "string" ? branchBody.commit.sha : null;

    if (commitSha === null) {
      logTreeCollectionDiagnostic({
        stage: "branch",
        httpStatus: 200,
        message: "Branch response missing commit SHA.",
      });

      throw new AuthError(
        AuthErrorCode.MALFORMED_RESPONSE,
        "GitHub returned an unexpected branch response.",
      );
    }

    let commitBody: GitHubCommitResponse;

    try {
      commitBody = (await githubFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/commits/${commitSha}`,
      )) as GitHubCommitResponse;
    } catch (error) {
      logTreeCollectionDiagnostic({
        stage: "commit",
        errorCode: readErrorCode(error),
        message: readErrorMessage(error),
      });
      throw error;
    }

    const treeSha = readTreeSha(commitBody);

    if (treeSha === null) {
      logTreeCollectionDiagnostic({
        stage: "commit",
        httpStatus: 200,
        message: "Commit response missing tree SHA.",
      });

      throw new AuthError(
        AuthErrorCode.MALFORMED_RESPONSE,
        "GitHub returned an unexpected commit response.",
      );
    }

    let treeBody: GitHubTreeResponse;

    try {
      treeBody = (await githubFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/trees/${treeSha}?recursive=1`,
      )) as GitHubTreeResponse;
    } catch (error) {
      logTreeCollectionDiagnostic({
        stage: "tree",
        errorCode: readErrorCode(error),
        message: readErrorMessage(error),
      });
      throw error;
    }

    return parseTree(treeBody);
  }

  async hasReleases(owner: string, name: string): Promise<boolean> {
    const token = await this.getTokenOrThrow();
    const body = await githubFetchJson(
      this.fetchFn,
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases?per_page=1`,
    );

    return Array.isArray(body) && body.length > 0;
  }

  private async getTokenOrThrow(): Promise<string> {
    const token = await this.authProvider.getToken();

    if (token === null) {
      throw new AuthError(
        AuthErrorCode.MISSING_TOKEN,
        "No GitHub token is stored.",
      );
    }

    return token;
  }

  private async fetchCurrentUser(token: string): Promise<GitHubUser> {
    logGitHubAuthDiagnostic({
      phase: "request-start",
      requestSent: false,
    });

    let body: unknown;

    try {
      body = await githubFetchJson(this.fetchFn, token, "/user");
    } catch (error) {
      if (error instanceof AuthError && error.code === AuthErrorCode.NETWORK_ERROR) {
        logGitHubAuthDiagnostic({
          phase: "network-error",
          requestSent: true,
          mappedErrorCode: AuthErrorCode.NETWORK_ERROR,
        });
      }

      throw error;
    }

    logGitHubAuthDiagnostic({
      phase: "response-parsed",
      requestSent: true,
      httpStatus: 200,
      contentType: "application/json",
      jsonParseSucceeded: true,
      topLevelFieldNames: getTopLevelFieldNames(body),
      loginExists: getLoginType(body) !== "missing",
      loginType: getLoginType(body),
    });

    console.info("[RepoReady Auth Diagnostic] request-headers", {
      authorization: REQUIRED_HEADERS.authorization,
      accept: REQUIRED_HEADERS.accept,
      "x-github-api-version": REQUIRED_HEADERS["x-github-api-version"],
    });

    return parseGitHubUser(body);
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

function parseLanguages(body: unknown): Record<string, number> {
  if (typeof body !== "object" || body === null) {
    return {};
  }

  const languages: Record<string, number> = {};

  for (const [language, bytes] of Object.entries(body)) {
    if (typeof bytes === "number") {
      languages[language] = bytes;
    }
  }

  return languages;
}

function parseReadme(
  body: GitHubReadmeResponse,
): { path: string; content: string } | null {
  if (typeof body.path !== "string" || typeof body.content !== "string") {
    return null;
  }

  if (body.encoding !== "base64") {
    return {
      path: body.path,
      content: body.content,
    };
  }

  return {
    path: body.path,
    content: decodeBase64Content(body.content),
  };
}

function parseContentFile(
  body: GitHubContentResponse,
): { path: string; content: string; size: number | null } {
  const path = typeof body.path === "string" ? body.path : null;
  const content = typeof body.content === "string" ? body.content : null;

  if (path === null || content === null) {
    throw new AuthError(
      AuthErrorCode.MALFORMED_RESPONSE,
      "GitHub returned an unreadable file response.",
    );
  }

  const decodedContent =
    body.encoding === "base64" ? decodeBase64Content(content) : content;

  return {
    path,
    content: decodedContent,
    size: typeof body.size === "number" ? body.size : null,
  };
}

function readTreeSha(commitBody: GitHubCommitResponse): string | null {
  if (typeof commitBody.tree?.sha === "string") {
    return commitBody.tree.sha;
  }

  if (typeof commitBody.commit?.tree?.sha === "string") {
    return commitBody.commit.tree.sha;
  }

  return null;
}

function readErrorCode(error: unknown): string | undefined {
  if (error instanceof AuthError) {
    return error.code;
  }

  return undefined;
}

function readErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}
