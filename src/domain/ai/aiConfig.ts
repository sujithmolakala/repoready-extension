export interface SanitizedOpenAIConfig {
  configured: boolean;
  provider: "openai";
  validatedAt: string | null;
}

export interface StoredOpenAIConfig {
  provider: "openai";
  validatedAt: string;
}

export const disconnectedOpenAIConfig: SanitizedOpenAIConfig = {
  configured: false,
  provider: "openai",
  validatedAt: null,
};

export function toSanitizedOpenAIConfig(
  config: StoredOpenAIConfig | null,
): SanitizedOpenAIConfig {
  if (config === null) {
    return disconnectedOpenAIConfig;
  }

  return {
    configured: true,
    provider: config.provider,
    validatedAt: config.validatedAt,
  };
}
