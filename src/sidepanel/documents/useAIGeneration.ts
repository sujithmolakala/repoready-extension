import { useCallback, useState } from "react";

import { AIErrorCode, type AIErrorPayload } from "../../domain/ai/aiErrors";
import type { DraftDocument } from "../../domain/models/draftDocument";
import type { DocumentType } from "../../domain/models/documentType";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import {
  MessageType,
  isGenerateDocumentWithAIResponse,
} from "../../shared/messages";

interface GenerateDocumentWithAIInput {
  owner: string;
  repo: string;
  documentType: DocumentType;
  facts: RepositoryFacts;
  userInstructions?: string;
}

interface UseAIGenerationResult {
  isGenerating: boolean;
  error: AIErrorPayload | null;
  generateWithAI: (
    input: GenerateDocumentWithAIInput,
  ) => Promise<DraftDocument | null>;
  clearError: () => void;
}

export function useAIGeneration(): UseAIGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<AIErrorPayload | null>(null);

  const generateWithAI = useCallback(async (input: GenerateDocumentWithAIInput) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.GENERATE_DOCUMENT_WITH_AI,
        payload: input,
      });

      if (!isGenerateDocumentWithAIResponse(response)) {
        setError({
          code: AIErrorCode.PROVIDER_UNAVAILABLE,
          message: "OpenAI returned an unexpected response. Try again later.",
        });

        return null;
      }

      if (!response.success || response.draft === undefined) {
        setError(
          response.error ?? {
            code: AIErrorCode.PROVIDER_UNAVAILABLE,
            message: "OpenAI returned an unexpected response. Try again later.",
          },
        );

        return null;
      }

      return response.draft;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    error,
    generateWithAI,
    clearError,
  };
}

function openOptionsPage(): void {
  void chrome.runtime.openOptionsPage();
}

export { openOptionsPage };
