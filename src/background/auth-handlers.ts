import { DisconnectGitHubUseCase } from "../application/DisconnectGitHubUseCase";
import { GetAuthStateUseCase } from "../application/GetAuthStateUseCase";
import { ValidateGitHubTokenUseCase } from "../application/ValidateGitHubTokenUseCase";
import { toSanitizedAuthState } from "../domain/auth";
import { AuthError, AuthErrorCode, authErrorToPayload } from "../domain/errors";
import {
  MessageType,
  type AuthStateUpdatedMessage,
  type DisconnectGitHubResponse,
  type GetAuthStateResponse,
  type ValidateGitHubTokenResponse,
} from "../shared/messages";

export function createAuthHandlers(
  getAuthStateUseCase: GetAuthStateUseCase,
  validateGitHubTokenUseCase: ValidateGitHubTokenUseCase,
  disconnectGitHubUseCase: DisconnectGitHubUseCase,
  broadcastAuthState: (authState: GetAuthStateResponse["authState"]) => void,
) {
  async function handleGetAuthState(): Promise<GetAuthStateResponse> {
    const authState = await getAuthStateUseCase.execute();

    return { authState };
  }

  async function handleValidateGitHubToken(
    token: string,
  ): Promise<ValidateGitHubTokenResponse> {
    try {
      const storedAuthState = await validateGitHubTokenUseCase.execute(token);
      const authState = toSanitizedAuthState(storedAuthState);

      broadcastAuthState(authState);

      return {
        success: true,
        authState,
      };
    } catch (error) {
      console.info("[RepoReady Auth Diagnostic]", {
        phase: "handler-error",
        errorName: error instanceof Error ? error.name : typeof error,
        isAuthError: error instanceof AuthError,
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: authErrorToPayload(error),
        };
      }

      return {
        success: false,
        error: {
          code: AuthErrorCode.API_UNAVAILABLE,
          message: "GitHub returned an unexpected response. Try again later.",
        },
      };
    }
  }

  async function handleDisconnectGitHub(): Promise<DisconnectGitHubResponse> {
    await disconnectGitHubUseCase.execute();
    const authState = await getAuthStateUseCase.execute();

    broadcastAuthState(authState);

    return { success: true };
  }

  return {
    handleGetAuthState,
    handleValidateGitHubToken,
    handleDisconnectGitHub,
  };
}

export function createAuthStateBroadcaster() {
  return (authState: GetAuthStateResponse["authState"]): void => {
    const message: AuthStateUpdatedMessage = {
      type: MessageType.AUTH_STATE_UPDATED,
      payload: { authState },
    };

    void chrome.runtime.sendMessage(message).catch(() => {
      // Options or side panel may not be open.
    });
  };
}
