import {
  AIError,
  AIErrorCode,
  AIInvalidResponseError,
  AINetworkError,
  AIProviderUnavailableError,
  AIQuotaError,
  AIRateLimitError,
} from "../../domain/ai/aiErrors";
import { buildDocumentGenerationPrompt } from "../../domain/ai/promptBuilder";
import type {
  AIGenerationRequest,
  AIGenerationResult,
  AIProvider,
} from "./AIProvider";
import {
  OPENAI_API_BASE_URL,
  OPENAI_DOCUMENT_MODEL,
} from "./openaiModel";

export type FetchFn = typeof fetch;

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";

  constructor(
    private readonly getApiKey: () => Promise<string | null>,
    private readonly fetchFn: FetchFn = fetch.bind(globalThis),
  ) {}

  async generateDocument(
    request: AIGenerationRequest,
  ): Promise<AIGenerationResult> {
    const apiKey = await this.getApiKey();

    if (apiKey === null || apiKey.trim().length === 0) {
      throw new AIError(
        AIErrorCode.MISSING_API_KEY,
        "Connect OpenAI in Settings before generating with AI.",
      );
    }

    const prompt = buildDocumentGenerationPrompt({
      documentType: request.documentType,
      facts: request.facts,
      staticTemplate: request.staticTemplate,
      userInstructions: request.userInstructions,
    });

    let response: Response;

    try {
      response = await this.fetchFn(`${OPENAI_API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_DOCUMENT_MODEL,
          messages: [
            { role: "system", content: prompt.systemPrompt },
            { role: "user", content: prompt.userPrompt },
          ],
          temperature: 0.2,
        }),
      });
    } catch {
      throw new AINetworkError("OpenAI could not be reached. Try again.");
    }

    let body: OpenAIChatCompletionResponse;

    try {
      body = (await response.json()) as OpenAIChatCompletionResponse;
    } catch {
      throw new AIInvalidResponseError(
        "OpenAI returned an invalid document response.",
      );
    }

    if (!response.ok) {
      throw mapOpenAIHttpError(response.status, body);
    }

    const markdown = body.choices?.[0]?.message?.content?.trim() ?? "";

    if (markdown.length === 0) {
      throw new AIInvalidResponseError(
        "OpenAI returned an invalid document response.",
      );
    }

    return {
      markdown,
      provider: this.id,
      model: OPENAI_DOCUMENT_MODEL,
    };
  }

  async validateApiKey(apiKey: string): Promise<void> {
    const trimmedKey = apiKey.trim();

    if (trimmedKey.length === 0) {
      throw new AIError(
        AIErrorCode.MISSING_API_KEY,
        "Enter an OpenAI API key.",
      );
    }

    if (!trimmedKey.startsWith("sk-")) {
      throw new AIError(
        AIErrorCode.MALFORMED_API_KEY,
        "The OpenAI API key format looks invalid.",
      );
    }

    let response: Response;

    try {
      response = await this.fetchFn(`${OPENAI_API_BASE_URL}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
        },
      });
    } catch {
      throw new AINetworkError("OpenAI could not be reached. Try again.");
    }

    if (response.ok) {
      return;
    }

    let body: OpenAIChatCompletionResponse;

    try {
      body = (await response.json()) as OpenAIChatCompletionResponse;
    } catch {
      throw mapOpenAIHttpError(response.status, {});
    }

    throw mapOpenAIHttpError(response.status, body);
  }
}

function mapOpenAIHttpError(
  status: number,
  body: OpenAIChatCompletionResponse,
): AIError {
  const errorType = body.error?.type ?? body.error?.code ?? "";

  if (status === 401) {
    return new AIError(
      AIErrorCode.INVALID_API_KEY,
      "The OpenAI API key is invalid.",
    );
  }

  if (status === 429) {
    if (errorType.includes("insufficient_quota") || errorType.includes("quota")) {
      return new AIQuotaError(
        "Your OpenAI account does not currently have available API quota.",
      );
    }

    return new AIRateLimitError(
      "OpenAI rate limit reached. Wait a moment and try again.",
    );
  }

  if (status >= 500) {
    return new AIProviderUnavailableError(
      "OpenAI is temporarily unavailable. Try again later.",
    );
  }

  return new AIInvalidResponseError(
    "OpenAI returned an invalid document response.",
  );
}
