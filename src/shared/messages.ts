import type { SanitizedAuthState } from "../domain/auth";
import type { AuthErrorPayload } from "../domain/errors";
import type { GitHubRepository } from "../domain/repository";

export const MessageType = {
  REPO_DETECTED: "REPO_DETECTED",
  GET_REPO_STATE: "GET_REPO_STATE",
  REPO_STATE_UPDATED: "REPO_STATE_UPDATED",
  GET_AUTH_STATE: "GET_AUTH_STATE",
  AUTH_STATE_UPDATED: "AUTH_STATE_UPDATED",
  VALIDATE_GITHUB_TOKEN: "VALIDATE_GITHUB_TOKEN",
  DISCONNECT_GITHUB: "DISCONNECT_GITHUB",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface RepoDetectedMessage {
  type: typeof MessageType.REPO_DETECTED;
  payload: {
    url: string;
    repository: GitHubRepository | null;
  };
}

export interface GetRepoStateMessage {
  type: typeof MessageType.GET_REPO_STATE;
}

export interface RepoStateUpdatedMessage {
  type: typeof MessageType.REPO_STATE_UPDATED;
  payload: {
    repository: GitHubRepository | null;
  };
}

export interface GetAuthStateMessage {
  type: typeof MessageType.GET_AUTH_STATE;
}

export interface AuthStateUpdatedMessage {
  type: typeof MessageType.AUTH_STATE_UPDATED;
  payload: {
    authState: SanitizedAuthState;
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

export type ExtensionMessage =
  | RepoDetectedMessage
  | GetRepoStateMessage
  | RepoStateUpdatedMessage
  | GetAuthStateMessage
  | AuthStateUpdatedMessage
  | ValidateGitHubTokenMessage
  | DisconnectGitHubMessage;

export interface GetRepoStateResponse {
  repository: GitHubRepository | null;
}

export interface GetAuthStateResponse {
  authState: SanitizedAuthState;
}

export interface ValidateGitHubTokenResponse {
  success: boolean;
  authState?: SanitizedAuthState;
  error?: AuthErrorPayload;
}

export interface DisconnectGitHubResponse {
  success: boolean;
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

export function isSanitizedAuthState(value: unknown): value is SanitizedAuthState {
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
    messageType === MessageType.DISCONNECT_GITHUB
  );
}
