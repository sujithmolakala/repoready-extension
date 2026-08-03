export {
  MessageType,
  isExtensionMessage,
  isGetRepoStateResponse,
  isGetAuthStateResponse,
  isValidateGitHubTokenResponse,
  isDisconnectGitHubResponse,
  isSanitizedAuthState,
  type ExtensionMessage,
  type GetAuthStateMessage,
  type GetAuthStateResponse,
  type ValidateGitHubTokenMessage,
  type ValidateGitHubTokenResponse,
  type DisconnectGitHubMessage,
  type DisconnectGitHubResponse,
  type AuthStateUpdatedMessage,
} from "./messages";
export { useAuthState } from "./hooks/useAuthState";
