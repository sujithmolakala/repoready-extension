import { useAuthState } from "../shared/hooks/useAuthState";
import { useRepoState } from "./useRepoState";
import { useRepositoryFacts } from "./useRepositoryFacts";

function openOptionsPage(): void {
  void chrome.runtime.openOptionsPage();
}

export default function App() {
  const { repository, isLoading: isRepoLoading } = useRepoState();
  const { authState, isLoading: isAuthLoading } = useAuthState();
  const {
    debugFacts,
    isLoading: isFactsLoading,
    error: factsError,
    repositoryKey,
  } = useRepositoryFacts();

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 px-6 py-8 text-white">
      <h1 className="text-2xl font-semibold tracking-tight">RepoReady</h1>

      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        {isAuthLoading ? (
          <p className="text-sm text-slate-400">Checking GitHub connection…</p>
        ) : authState.authenticated && authState.username !== null ? (
          <div className="flex items-center gap-3">
            {authState.avatarUrl ? (
              <img
                alt=""
                className="h-8 w-8 rounded-full"
                src={authState.avatarUrl}
              />
            ) : null}
            <p className="text-sm text-slate-200">
              Connected as {authState.username}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              Connect GitHub in Settings to enable repository analysis.
            </p>
            <button
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-slate-200"
              onClick={openOptionsPage}
              type="button"
            >
              Open Settings
            </button>
          </div>
        )}
      </section>

      <section className="mt-6 space-y-2">
        {isRepoLoading ? (
          <p className="text-sm text-slate-400">Checking current page…</p>
        ) : repository ? (
          <>
            <p className="text-sm font-medium text-emerald-400">
              Repository detected
            </p>
            <p className="text-xl font-semibold">
              {repository.owner}/{repository.name}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Open a GitHub repository to begin
          </p>
        )}
      </section>

      {repository && authState.authenticated ? (
        <section className="mt-6 flex min-h-0 flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">
            Repository facts (debug)
          </h2>

          {isFactsLoading || (debugFacts === null && factsError === null) ? (
            <p className="mt-3 text-sm text-slate-400">
              Collecting repository facts…
            </p>
          ) : null}

          {factsError ? (
            <p className="mt-3 text-sm text-red-300">{factsError}</p>
          ) : null}

          {debugFacts && repositoryKey ? (
            <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(debugFacts, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
