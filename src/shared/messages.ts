import type { RepositoryFactsState } from "../domain/models/repositoryFacts";
import type { HealthReportState } from "../domain/models/healthReport";
import type { SanitizedOpenAIConfig } from "../domain/ai/aiConfig";
import type { AIErrorPayload } from "../domain/ai/aiErrors";
import type { DraftDocument } from "../domain/models/draftDocument";
import type { DocumentType } from "../domain/models/documentType";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";

export const MessageType = {
  REPO_DETECTED: "REPO_DETECTED",
  GET_REPO_STATE: "GET_REPO_STATE",
  REPO_STATE_UPDATED: "REPO_STATE_UPDATED",
  GET_AUTH_STATE: "GET_AUTH_STATE",
  AUTH_STATE_UPDATED: "AUTH_STATE_UPDATED",
  VALIDATE_GITHUB_TOKEN: "VALIDATE_GITHUB_TOKEN",
  DISCONNECT_GITHUB: "DISCONNECT_GITHUB",
  GET_REPOSITORY_FACTS: "GET_REPOSITORY_FACTS",
  REPOSITORY_FACTS_UPDATED: "REPOSITORY_FACTS_UPDATED",
  GET_HEALTH_REPORT: "GET_HEALTH_REPORT",
  HEALTH_REPORT_UPDATED: "HEALTH_REPORT_UPDATED",
  GET_OPENAI_CONFIG: "GET_OPENAI_CONFIG",
  OPENAI_CONFIG_UPDATED: "OPENAI_CONFIG_UPDATED",
  VALIDATE_OPENAI_KEY: "VALIDATE_OPENAI_KEY",
  DISCONNECT_OPENAI: "DISCONNECT_OPENAI",
  GENERATE_DOCUMENT_WITH_AI: "GENERATE_DOCUMENT_WITH_AI",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface RepoDetectedMessage {
  type: typeof MessageType.REPO_DETECTED;
  payload: {
    url: string;
    repository: import("../domain/repository").GitHubRepository | null;
  };
}

export interface GetRepoStateMessage {
  type: typeof MessageType.GET_REPO_STATE;
}

export interface RepoStateUpdatedMessage {
  type: typeof MessageType.REPO_STATE_UPDATED;
  payload: {
    repository: import("../domain/repository").GitHubRepository | null;
  };
}

export interface GetAuthStateMessage {
  type: typeof MessageType.GET_AUTH_STATE;
}

export interface AuthStateUpdatedMessage {
  type: typeof MessageType.AUTH_STATE_UPDATED;
  payload: {
    authState: import("../domain/auth").SanitizedAuthState;
  };
}

export interface ValidateGitHubTokenMessage {
  type: typeof MessageType.VALIDATE_GITHUB_TOKEN;
  payload: {
    token: string;
  };
}

export interface DisconnectGitHubMessage {
  type: typeof MessageType.DISCONNECT_GITHUB;
}

export interface GetRepositoryFactsMessage {
  type: typeof MessageType.GET_REPOSITORY_FACTS;
}

export interface RepositoryFactsUpdatedMessage {
  type: typeof MessageType.REPOSITORY_FACTS_UPDATED;
  payload: {
    factsState: RepositoryFactsState;
  };
}

export interface GetHealthReportMessage {
  type: typeof MessageType.GET_HEALTH_REPORT;
}

export interface HealthReportUpdatedMessage {
  type: typeof MessageType.HEALTH_REPORT_UPDATED;
  payload: {
    healthState: HealthReportState;
  };
}

export interface GetOpenAIConfigMessage {
  type: typeof MessageType.GET_OPENAI_CONFIG;
}

export interface OpenAIConfigUpdatedMessage {
  type: typeof MessageType.OPENAI_CONFIG_UPDATED;
  payload: {
    openAIConfig: SanitizedOpenAIConfig;
  };
}

export interface ValidateOpenAIKeyMessage {
  type: typeof MessageType.VALIDATE_OPENAI_KEY;
  payload: {
    apiKey: string;
  };
}

export interface DisconnectOpenAIMessage {
  type: typeof MessageType.DISCONNECT_OPENAI;
}

export interface GenerateDocumentWithAIMessage {
  type: typeof MessageType.GENERATE_DOCUMENT_WITH_AI;
  payload: GenerateDocumentWithAIPayload;
}

export interface GenerateDocumentWithAIPayload {
  owner: string;
  repo: string;
  documentType: DocumentType;
  facts: RepositoryFacts;
  userInstructions?: string;
}

export type ExtensionMessage =
  | RepoDetectedMessage
  | GetRepoStateMessage
  | RepoStateUpdatedMessage
  | GetAuthStateMessage
  | AuthStateUpdatedMessage
  | ValidateGitHubTokenMessage
  | DisconnectGitHubMessage
  | GetRepositoryFactsMessage
  | RepositoryFactsUpdatedMessage
  | GetHealthReportMessage
  | HealthReportUpdatedMessage
  | GetOpenAIConfigMessage
  | OpenAIConfigUpdatedMessage
  | ValidateOpenAIKeyMessage
  | DisconnectOpenAIMessage
  | GenerateDocumentWithAIMessage;

export interface GetRepoStateResponse {
  repository: import("../domain/repository").GitHubRepository | null;
}

export interface GetAuthStateResponse {
  authState: import("../domain/auth").SanitizedAuthState;
}

export interface ValidateGitHubTokenResponse {
  success: boolean;
  authState?: import("../domain/auth").SanitizedAuthState;
  error?: import("../domain/errors").AuthErrorPayload;
}

export interface DisconnectGitHubResponse {
  success: boolean;
}

export interface GetRepositoryFactsResponse {
  factsState: RepositoryFactsState;
}

export interface GetHealthReportResponse {
  healthState: HealthReportState;
}

export interface GetOpenAIConfigResponse {
  openAIConfig: SanitizedOpenAIConfig;
}

export interface ValidateOpenAIKeyResponse {
  success: boolean;
  openAIConfig?: SanitizedOpenAIConfig;
  error?: AIErrorPayload;
}

export interface DisconnectOpenAIResponse {
  success: boolean;
}

export interface GenerateDocumentWithAIResponse {
  success: boolean;
  draft?: DraftDocument;
  error?: AIErrorPayload;
}

export function isGetRepoStateResponse(
  value: unknown,
): value is GetRepoStateResponse {
  if (typeof value !== "object" || value === null || !("repository" in value)) {
    return false;
  }

  const { repository } = value;

  if (repository === null) {
    return true;
  }

  return (
    typeof repository === "object" &&
    "owner" in repository &&
    "name" in repository &&
    typeof repository.owner === "string" &&
    typeof repository.name === "string"
  );
}

export function isGetAuthStateResponse(
  value: unknown,
): value is GetAuthStateResponse {
  if (typeof value !== "object" || value === null || !("authState" in value)) {
    return false;
  }

  return isSanitizedAuthState(value.authState);
}

export function isValidateGitHubTokenResponse(
  value: unknown,
): value is ValidateGitHubTokenResponse {
  if (typeof value !== "object" || value === null || !("success" in value)) {
    return false;
  }

  const response = value as ValidateGitHubTokenResponse;

  if (typeof response.success !== "boolean") {
    return false;
  }

  if (response.authState !== undefined && !isSanitizedAuthState(response.authState)) {
    return false;
  }

  if ("token" in response) {
    return false;
  }

  return true;
}

export function isDisconnectGitHubResponse(
  value: unknown,
): value is DisconnectGitHubResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof value.success === "boolean" &&
    !("token" in value)
  );
}

export function isGetRepositoryFactsResponse(
  value: unknown,
): value is GetRepositoryFactsResponse {
  if (typeof value !== "object" || value === null || !("factsState" in value)) {
    return false;
  }

  return isRepositoryFactsState(value.factsState);
}

export function isRepositoryFactsState(
  value: unknown,
): value is RepositoryFactsState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    (typeof state.repositoryKey === "string" || state.repositoryKey === null) &&
    typeof state.isLoading === "boolean" &&
    (typeof state.error === "string" || state.error === null) &&
    (state.facts === null || isRepositoryFacts(state.facts))
  );
}

export function isGetHealthReportResponse(
  value: unknown,
): value is GetHealthReportResponse {
  if (typeof value !== "object" || value === null || !("healthState" in value)) {
    return false;
  }

  return isHealthReportState(value.healthState);
}

export function isHealthReportState(
  value: unknown,
): value is HealthReportState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    (typeof state.repositoryKey === "string" || state.repositoryKey === null) &&
    typeof state.isLoading === "boolean" &&
    (typeof state.error === "string" || state.error === null) &&
    (state.report === null || isHealthReport(state.report))
  );
}

export function isHealthReport(
  value: unknown,
): value is import("../domain/models/healthReport").HealthReport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const report = value as Record<string, unknown>;

  return (
    typeof report.owner === "string" &&
    typeof report.repo === "string" &&
    typeof report.totalScore === "number" &&
    typeof report.maxScore === "number" &&
    typeof report.analyzedAt === "string" &&
    Array.isArray(report.categories) &&
    Array.isArray(report.recommendations)
  );
}

export function isRepositoryFacts(value: unknown): value is import("../domain/models/repositoryFacts").RepositoryFacts {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const facts = value as Record<string, unknown>;

  return (
    typeof facts.owner === "string" &&
    typeof facts.name === "string" &&
    typeof facts.defaultBranch === "string" &&
    typeof facts.fetchedAt === "string"
  );
}

export function isSanitizedAuthState(value: unknown): value is import("../domain/auth").SanitizedAuthState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  if ("token" in state) {
    return false;
  }

  return (
    typeof state.authenticated === "boolean" &&
    (typeof state.username === "string" || state.username === null) &&
    (typeof state.avatarUrl === "string" || state.avatarUrl === null) &&
    (typeof state.validatedAt === "string" || state.validatedAt === null)
  );
}

export function isSanitizedOpenAIConfig(
  value: unknown,
): value is SanitizedOpenAIConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  if ("apiKey" in config) {
    return false;
  }

  return (
    typeof config.configured === "boolean" &&
    config.provider === "openai" &&
    (typeof config.validatedAt === "string" || config.validatedAt === null)
  );
}

export function isGetOpenAIConfigResponse(
  value: unknown,
): value is GetOpenAIConfigResponse {
  if (typeof value !== "object" || value === null || !("openAIConfig" in value)) {
    return false;
  }

  return isSanitizedOpenAIConfig(value.openAIConfig);
}

export function isValidateOpenAIKeyResponse(
  value: unknown,
): value is ValidateOpenAIKeyResponse {
  if (typeof value !== "object" || value === null || !("success" in value)) {
    return false;
  }

  const response = value as ValidateOpenAIKeyResponse;

  if (typeof response.success !== "boolean") {
    return false;
  }

  if (
    response.openAIConfig !== undefined &&
    !isSanitizedOpenAIConfig(response.openAIConfig)
  ) {
    return false;
  }

  if ("apiKey" in response) {
    return false;
  }

  return true;
}

export function isDisconnectOpenAIResponse(
  value: unknown,
): value is DisconnectOpenAIResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof value.success === "boolean" &&
    !("apiKey" in value)
  );
}

export function isGenerateDocumentWithAIResponse(
  value: unknown,
): value is GenerateDocumentWithAIResponse {
  if (typeof value !== "object" || value === null || !("success" in value)) {
    return false;
  }

  const response = value as GenerateDocumentWithAIResponse;

  if (typeof response.success !== "boolean") {
    return false;
  }

  if ("apiKey" in response || "prompt" in response) {
    return false;
  }

  if (response.draft !== undefined) {
    const draft = response.draft as unknown as Record<string, unknown>;

    if ("apiKey" in draft || "prompt" in draft) {
      return false;
    }
  }

  return true;
}

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const messageType = value.type;

  return (
    messageType === MessageType.REPO_DETECTED ||
    messageType === MessageType.GET_REPO_STATE ||
    messageType === MessageType.REPO_STATE_UPDATED ||
    messageType === MessageType.GET_AUTH_STATE ||
    messageType === MessageType.AUTH_STATE_UPDATED ||
    messageType === MessageType.VALIDATE_GITHUB_TOKEN ||
    messageType === MessageType.DISCONNECT_GITHUB ||
    messageType === MessageType.GET_REPOSITORY_FACTS ||
    messageType === MessageType.REPOSITORY_FACTS_UPDATED ||
    messageType === MessageType.GET_HEALTH_REPORT ||
    messageType === MessageType.HEALTH_REPORT_UPDATED ||
    messageType === MessageType.GET_OPENAI_CONFIG ||
    messageType === MessageType.OPENAI_CONFIG_UPDATED ||
    messageType === MessageType.VALIDATE_OPENAI_KEY ||
    messageType === MessageType.DISCONNECT_OPENAI ||
    messageType === MessageType.GENERATE_DOCUMENT_WITH_AI
  );
}
