import type { RepositoryFactsState } from "../domain/models/repositoryFacts";

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

export type ExtensionMessage =
  | RepoDetectedMessage
  | GetRepoStateMessage
  | RepoStateUpdatedMessage
  | GetAuthStateMessage
  | AuthStateUpdatedMessage
  | ValidateGitHubTokenMessage
  | DisconnectGitHubMessage
  | GetRepositoryFactsMessage
  | RepositoryFactsUpdatedMessage;

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
    messageType === MessageType.REPOSITORY_FACTS_UPDATED
  );
}
