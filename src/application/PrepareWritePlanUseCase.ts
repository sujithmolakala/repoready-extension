import { buildBaseBranchName, resolveUniqueBranchName } from "../domain/github/branchNaming";
import { getDefaultCommitMessage } from "../domain/github/commitMessages";
import { resolveDestinationPath } from "../domain/github/destinationPath";
import {
  detectFileWriteAction,
  fileExistsAtPath,
  getFileActionLabel,
} from "../domain/github/fileExistence";
import {
  getDefaultPullRequestBody,
  getDefaultPullRequestTitle,
} from "../domain/github/pullRequestDefaults";
import type {
  PrepareWritePlanInput,
  WritePlan,
} from "../domain/github/writeTypes";

export class PrepareWritePlanUseCase {
  execute(input: PrepareWritePlanInput): WritePlan {
    const destinationPath = resolveDestinationPath(
      input.draft.documentType,
      input.destinationPath ?? input.draft.destinationPath,
    );
    const fileAction = detectFileWriteAction(input.facts, destinationPath);
    const baseBranchName = buildBaseBranchName(
      input.draft.documentType,
      destinationPath,
    );
    const branchName = resolveUniqueBranchName(
      baseBranchName,
      input.existingBranchNames ?? [],
    );

    return {
      destinationPath,
      fileAction,
      fileActionLabel: getFileActionLabel(fileAction),
      branchName,
      commitMessage: getDefaultCommitMessage(
        input.draft.documentType,
        destinationPath,
        fileAction,
      ),
      pullRequestTitle: getDefaultPullRequestTitle(
        input.draft.documentType,
        destinationPath,
        fileAction,
      ),
      pullRequestBody: getDefaultPullRequestBody(
        input.draft.documentType,
        destinationPath,
        fileAction,
      ),
      defaultBranch: input.facts.defaultBranch,
      fileExists: fileExistsAtPath(input.facts, destinationPath),
    };
  }
}
