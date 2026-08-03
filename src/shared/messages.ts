import type { GitHubRepository } from "../domain/repository";

export const MessageType = {
  REPO_DETECTED: "REPO_DETECTED",
  GET_REPO_STATE: "GET_REPO_STATE",
  REPO_STATE_UPDATED: "REPO_STATE_UPDATED",
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

export type ExtensionMessage =
  | RepoDetectedMessage
  | GetRepoStateMessage
  | RepoStateUpdatedMessage;

export interface GetRepoStateResponse {
  repository: GitHubRepository | null;
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

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const messageType = value.type;

  return (
    messageType === MessageType.REPO_DETECTED ||
    messageType === MessageType.GET_REPO_STATE ||
    messageType === MessageType.REPO_STATE_UPDATED
  );
}
