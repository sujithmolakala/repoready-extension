import type { StoredOpenAIConfig } from "../../domain/ai/aiConfig";

const API_KEY_KEY = "openai_api_key";
const CONFIG_KEY = "openai_config";

export class OpenAIKeyStore {
  async getApiKey(): Promise<string | null> {
    const result = await chrome.storage.local.get(API_KEY_KEY);
    const apiKey = result[API_KEY_KEY];

    return typeof apiKey === "string" && apiKey.length > 0 ? apiKey : null;
  }

  async setApiKey(apiKey: string): Promise<void> {
    await chrome.storage.local.set({ [API_KEY_KEY]: apiKey });
  }

  async getConfig(): Promise<StoredOpenAIConfig | null> {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const config = result[CONFIG_KEY];

    if (!isStoredOpenAIConfig(config)) {
      return null;
    }

    return config;
  }

  async setConfig(config: StoredOpenAIConfig): Promise<void> {
    await chrome.storage.local.set({ [CONFIG_KEY]: config });
  }

  async clearAll(): Promise<void> {
    await chrome.storage.local.remove([API_KEY_KEY, CONFIG_KEY]);
  }
}

function isStoredOpenAIConfig(value: unknown): value is StoredOpenAIConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return config.provider === "openai" && typeof config.validatedAt === "string";
}
