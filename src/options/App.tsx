import { ConnectedView } from "./components/ConnectedView";
import { DisconnectedView } from "./components/DisconnectedView";
import { OpenAIConnectedView } from "./components/OpenAIConnectedView";
import { OpenAIDisconnectedView } from "./components/OpenAISettingsSection";
import { useAuthActions } from "./useAuthActions";
import { useOpenAIActions } from "./useOpenAIActions";
import { useAuthState } from "../shared/hooks/useAuthState";
import { useOpenAIConfig } from "../shared/hooks/useOpenAIConfig";

export default function App() {
  const { authState, isLoading } = useAuthState();
  const { openAIConfig, isLoading: isOpenAILoading } = useOpenAIConfig();
  const { isValidating, error, connectGitHub, disconnectGitHub, clearError } =
    useAuthActions();
  const {
    isValidating: isOpenAIValidating,
    error: openAIError,
    connectOpenAI,
    disconnectOpenAI,
    clearError: clearOpenAIError,
  } = useOpenAIActions();

  const handleConnect = (token: string): void => {
    void connectGitHub(token);
  };

  const handleDisconnect = (): void => {
    void disconnectGitHub();
  };

  const handleOpenAIConnect = (apiKey: string): void => {
    void connectOpenAI(apiKey);
  };

  const handleOpenAIDisconnect = (): void => {
    void disconnectOpenAI();
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">RepoReady Settings</h1>
      <p className="mt-2 text-sm text-slate-600">
        Manage GitHub authentication and optional OpenAI integration.
      </p>

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="text-base font-medium text-slate-900">GitHub</h2>
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading authentication status…</p>
            ) : authState.authenticated && authState.username !== null ? (
              <ConnectedView
                avatarUrl={authState.avatarUrl}
                onDisconnect={handleDisconnect}
                username={authState.username}
              />
            ) : (
              <DisconnectedView
                errorMessage={error?.message ?? null}
                isValidating={isValidating}
                onClearError={clearError}
                onConnect={handleConnect}
              />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-base font-medium text-slate-900">OpenAI</h2>
          <div className="mt-4">
            {isOpenAILoading ? (
              <p className="text-sm text-slate-500">Loading OpenAI status…</p>
            ) : openAIConfig.configured ? (
              <OpenAIConnectedView
                onDisconnect={handleOpenAIDisconnect}
                validatedAt={openAIConfig.validatedAt}
              />
            ) : (
              <OpenAIDisconnectedView
                errorMessage={openAIError?.message ?? null}
                isValidating={isOpenAIValidating}
                onClearError={clearOpenAIError}
                onConnect={handleOpenAIConnect}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
