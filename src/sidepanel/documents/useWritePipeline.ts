import { useCallback, useState } from "react";

import { GitHubWriteErrorCode } from "../../domain/github/writeErrors";
import type { GitHubWriteErrorPayload } from "../../domain/github/writeErrors";
import type {
  CreatePullRequestResult,
  WritePlan,
} from "../../domain/github/writeTypes";
import type { DraftDocument } from "../../domain/models/draftDocument";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import {
  MessageType,
  isCreatePullRequestResponse,
  isPrepareWritePlanResponse,
} from "../../shared/messages";

interface PrepareWritePlanInput {
  facts: RepositoryFacts;
  draft: DraftDocument;
  destinationPath?: string;
}

interface CreatePullRequestInput {
  facts: RepositoryFacts;
  draft: DraftDocument;
  destinationPath: string;
  branchName: string;
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
}

export function useWritePipeline() {
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<GitHubWriteErrorPayload | null>(null);

  const prepareWritePlan = useCallback(async (input: PrepareWritePlanInput) => {
    setIsPreparing(true);
    setError(null);

    try {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.PREPARE_WRITE_PLAN,
        payload: input,
      });

      if (!isPrepareWritePlanResponse(response)) {
        setError({
          code: GitHubWriteErrorCode.API_UNAVAILABLE,
          message: "GitHub returned an unexpected response. Try again later.",
        });

        return null;
      }

      if (!response.success || response.plan === undefined) {
        setError(
          response.error ?? {
            code: GitHubWriteErrorCode.API_UNAVAILABLE,
            message: "GitHub returned an unexpected response. Try again later.",
          },
        );

        return null;
      }

      return response.plan;
    } finally {
      setIsPreparing(false);
    }
  }, []);

  const createPullRequest = useCallback(async (input: CreatePullRequestInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.CREATE_PULL_REQUEST,
        payload: input,
      });

      if (!isCreatePullRequestResponse(response)) {
        setError({
          code: GitHubWriteErrorCode.API_UNAVAILABLE,
          message: "Could not create the pull request. Try again.",
        });

        return null;
      }

      if (!response.success || response.result === undefined) {
        setError(
          response.error ?? {
            code: GitHubWriteErrorCode.API_UNAVAILABLE,
            message: "Could not create the pull request. Try again.",
          },
        );

        return null;
      }

      return response.result;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isPreparing,
    isSubmitting,
    error,
    prepareWritePlan,
    createPullRequest,
    clearError,
  };
}

export type { WritePlan, CreatePullRequestResult };
