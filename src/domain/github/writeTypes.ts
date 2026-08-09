import type { DraftDocument } from "../models/draftDocument";
import type { RepositoryFacts } from "../models/repositoryFacts";
import type { FileWriteAction } from "./fileExistence";

export type { FileWriteAction };

export interface CreatePullRequestRequest {
  facts: RepositoryFacts;
  draft: DraftDocument;
  destinationPath: string;
  branchName: string;
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
}

export interface CreatePullRequestResult {
  pullRequestUrl: string;
  pullRequestNumber: number;
  branchName: string;
  commitSha: string;
  owner: string;
  repo: string;
  pullRequestTitle: string;
}

export interface WritePlan {
  destinationPath: string;
  fileAction: FileWriteAction;
  fileActionLabel: string;
  branchName: string;
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
  defaultBranch: string;
  fileExists: boolean;
}

export interface PrepareWritePlanInput {
  facts: RepositoryFacts;
  draft: DraftDocument;
  destinationPath?: string;
  existingBranchNames?: readonly string[];
}
