import { ConnectedView } from "./components/ConnectedView";
import { DisconnectedView } from "./components/DisconnectedView";
import { useAuthActions } from "./useAuthActions";
import { useAuthState } from "../shared/hooks/useAuthState";

export default function App() {
  const { authState, isLoading } = useAuthState();
  const { isValidating, error, connectGitHub, disconnectGitHub, clearError } =
    useAuthActions();

  const handleConnect = (token: string): void => {
    void connectGitHub(token);
  };

  const handleDisconnect = (): void => {
    void disconnectGitHub();
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">RepoReady Settings</h1>
      <p className="mt-2 text-sm text-slate-600">
        Manage GitHub authentication for repository analysis.
      </p>

      <div className="mt-8">
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
    </main>
  );
}
