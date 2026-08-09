import type {
  CreatePullRequestRequest,
  CreatePullRequestResult,
} from "../../domain/github/writeTypes";

export interface GitHubWriter {
  createPullRequest(
    request: CreatePullRequestRequest,
  ): Promise<CreatePullRequestResult>;

  listBranchNames(owner: string, repo: string): Promise<string[]>;
}
