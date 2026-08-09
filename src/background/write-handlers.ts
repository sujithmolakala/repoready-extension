import {
  CreatePullRequestUseCase,
  PrepareWritePlanApplicationUseCase,
} from "../application/CreatePullRequestUseCase";
import {
  GitHubWriteError,
  GitHubWriteErrorCode,
  gitHubWriteErrorToPayload,
} from "../domain/github/writeErrors";
import type {
  CreatePullRequestPayload,
  PrepareWritePlanPayload,
} from "../shared/messages";
import type {
  CreatePullRequestResponse,
  PrepareWritePlanResponse,
} from "../shared/messages";

export function createWriteHandlers(
  prepareWritePlanUseCase: PrepareWritePlanApplicationUseCase,
  createPullRequestUseCase: CreatePullRequestUseCase,
) {
  async function handlePrepareWritePlan(
    payload: PrepareWritePlanPayload,
  ): Promise<PrepareWritePlanResponse> {
    try {
      const plan = await prepareWritePlanUseCase.execute({
        facts: payload.facts,
        draft: payload.draft,
        destinationPath: payload.destinationPath,
      });

      return { success: true, plan };
    } catch (error) {
      if (error instanceof GitHubWriteError) {
        return { success: false, error: gitHubWriteErrorToPayload(error) };
      }

      return {
        success: false,
        error: {
          code: GitHubWriteErrorCode.API_UNAVAILABLE,
          message: "GitHub returned an unexpected response. Try again later.",
        },
      };
    }
  }

  async function handleCreatePullRequest(
    payload: CreatePullRequestPayload,
  ): Promise<CreatePullRequestResponse> {
    try {
      const result = await createPullRequestUseCase.execute({
        facts: payload.facts,
        draft: payload.draft,
        destinationPath: payload.destinationPath,
        branchName: payload.branchName,
        commitMessage: payload.commitMessage,
        pullRequestTitle: payload.pullRequestTitle,
        pullRequestBody: payload.pullRequestBody,
      });

      return { success: true, result };
    } catch (error) {
      if (error instanceof GitHubWriteError) {
        return { success: false, error: gitHubWriteErrorToPayload(error) };
      }

      return {
        success: false,
        error: {
          code: GitHubWriteErrorCode.API_UNAVAILABLE,
          message: "Could not create the pull request. Try again.",
        },
      };
    }
  }

  return {
    handlePrepareWritePlan,
    handleCreatePullRequest,
  };
}
