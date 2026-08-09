import {
  GitHubWriteError,
  GitHubWriteErrorCode,
} from "../../domain/github/writeErrors";
import type {
  CreatePullRequestRequest,
  CreatePullRequestResult,
} from "../../domain/github/writeTypes";
import type { AuthProvider } from "../auth/AuthProvider";
import { githubWriteFetchJson, type FetchFn } from "./github-request";
import type { GitHubWriter } from "./GitHubWriter";

interface GitRefResponse {
  object?: { sha?: unknown };
  ref?: unknown;
}

interface GitCommitResponse {
  sha?: unknown;
  tree?: { sha?: unknown };
}

interface GitBlobResponse {
  sha?: unknown;
}

interface GitTreeResponse {
  sha?: unknown;
}

interface PullRequestResponse {
  html_url?: unknown;
  number?: unknown;
}

export class GitHubWriterImpl implements GitHubWriter {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly fetchFn: FetchFn = fetch.bind(globalThis),
  ) {}

  async listBranchNames(owner: string, repo: string): Promise<string[]> {
    const token = await this.getTokenOrThrow();
    const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const body = await githubWriteFetchJson(
      this.fetchFn,
      token,
      `${repoPath}/branches?per_page=100`,
    );

    if (!Array.isArray(body)) {
      return [];
    }

    return body
      .map((entry) => readBranchName(entry))
      .filter((name): name is string => name !== null);
  }

  async createPullRequest(
    request: CreatePullRequestRequest,
  ): Promise<CreatePullRequestResult> {
    const token = await this.getTokenOrThrow();
    const { owner, name: repo } = request.facts;
    const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const defaultBranch = request.facts.defaultBranch;
    let branchCreated = false;
    let commitCompleted = false;

    try {
      const baseRef = await this.getBranchRef(
        token,
        repoPath,
        defaultBranch,
      );
      const baseCommitSha = readSha(baseRef.object?.sha);

      if (baseCommitSha === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.MALFORMED_RESPONSE,
          "GitHub returned an unexpected branch response.",
        );
      }

      await githubWriteFetchJson(this.fetchFn, token, `${repoPath}/git/refs`, {
        method: "POST",
        body: {
          ref: `refs/heads/${request.branchName}`,
          sha: baseCommitSha,
        },
        expectedStatuses: [201],
      });
      branchCreated = true;

      const branchRef = await this.getBranchRef(
        token,
        repoPath,
        request.branchName,
      );
      const branchCommitSha = readSha(branchRef.object?.sha);

      if (branchCommitSha === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.BRANCH_CREATION_FAILED,
          "Could not verify the new branch after creation.",
        );
      }

      const branchCommit = (await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/commits/${branchCommitSha}`,
      )) as GitCommitResponse;
      const baseTreeSha = readSha(branchCommit.tree?.sha);

      if (baseTreeSha === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.MALFORMED_RESPONSE,
          "GitHub returned an unexpected commit response.",
        );
      }

      const blob = (await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/blobs`,
        {
          method: "POST",
          body: {
            content: request.draft.content,
            encoding: "utf-8",
          },
          expectedStatuses: [201],
        },
      )) as GitBlobResponse;
      const blobSha = readSha(blob.sha);

      if (blobSha === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.COMMIT_FAILED,
          "Could not create the file blob for this draft.",
        );
      }

      const tree = (await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/trees`,
        {
          method: "POST",
          body: {
            base_tree: baseTreeSha,
            tree: [
              {
                path: request.destinationPath,
                mode: "100644",
                type: "blob",
                sha: blobSha,
              },
            ],
          },
          expectedStatuses: [201],
        },
      )) as GitTreeResponse;
      const treeSha = readSha(tree.sha);

      if (treeSha === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.COMMIT_FAILED,
          "Could not create the commit tree for this draft.",
        );
      }

      const commit = (await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/commits`,
        {
          method: "POST",
          body: {
            message: request.commitMessage,
            tree: treeSha,
            parents: [branchCommitSha],
          },
          expectedStatuses: [201],
        },
      )) as GitCommitResponse;
      const commitSha = readSha(commit.sha);

      if (commitSha === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.COMMIT_FAILED,
          "Could not create the commit for this draft.",
        );
      }

      await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/refs/heads/${encodeBranchRef(request.branchName)}`,
        {
          method: "PATCH",
          body: { sha: commitSha },
          expectedStatuses: [200],
        },
      );
      commitCompleted = true;

      const pullRequest = (await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/pulls`,
        {
          method: "POST",
          body: {
            title: request.pullRequestTitle,
            body: request.pullRequestBody,
            head: request.branchName,
            base: defaultBranch,
          },
          expectedStatuses: [201],
        },
      )) as PullRequestResponse;

      const pullRequestUrl = readString(pullRequest.html_url);
      const pullRequestNumber = readNumber(pullRequest.number);

      if (pullRequestUrl === null || pullRequestNumber === null) {
        throw new GitHubWriteError(
          GitHubWriteErrorCode.PULL_REQUEST_FAILED,
          "GitHub created a pull request with an unexpected response.",
        );
      }

      return {
        pullRequestUrl,
        pullRequestNumber,
        branchName: request.branchName,
        commitSha,
        owner,
        repo,
        pullRequestTitle: request.pullRequestTitle,
      };
    } catch (error) {
      if (branchCreated && !commitCompleted) {
        await this.tryDeleteBranch(token, repoPath, request.branchName);
      }

      if (error instanceof GitHubWriteError) {
        throw error;
      }

      throw new GitHubWriteError(
        GitHubWriteErrorCode.API_UNAVAILABLE,
        "Could not create the pull request. Try again.",
      );
    }
  }

  private async tryDeleteBranch(
    token: string,
    repoPath: string,
    branchName: string,
  ): Promise<void> {
    try {
      await githubWriteFetchJson(
        this.fetchFn,
        token,
        `${repoPath}/git/refs/heads/${encodeBranchRef(branchName)}`,
        {
          method: "DELETE",
          expectedStatuses: [204],
        },
      );
    } catch {
      // Best-effort cleanup only.
    }
  }

  private async getBranchRef(
    token: string,
    repoPath: string,
    branchName: string,
  ): Promise<GitRefResponse> {
    const body = await githubWriteFetchJson(
      this.fetchFn,
      token,
      `${repoPath}/git/ref/heads/${encodeBranchRef(branchName)}`,
    );

    return body as GitRefResponse;
  }

  private async getTokenOrThrow(): Promise<string> {
    const token = await this.authProvider.getToken();

    if (token === null) {
      throw new GitHubWriteError(
        GitHubWriteErrorCode.MISSING_TOKEN,
        "Connect GitHub before creating a pull request.",
      );
    }

    return token;
  }
}

function encodeBranchRef(branchName: string): string {
  return branchName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function readBranchName(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const branch = value as { name?: unknown };

  return typeof branch.name === "string" && branch.name.length > 0
    ? branch.name
    : null;
}

function readSha(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
