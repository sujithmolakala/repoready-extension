import { useAuthState } from "../shared/hooks/useAuthState";
import { useRepoState } from "./useRepoState";

function openOptionsPage(): void {
  void chrome.runtime.openOptionsPage();
}

export default function App() {
  const { repository, isLoading: isRepoLoading } = useRepoState();
  const { authState, isLoading: isAuthLoading } = useAuthState();

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

      <section className="mt-8 flex flex-1 flex-col justify-center">
        {isRepoLoading ? (
          <p className="text-sm text-slate-400">Checking current page…</p>
        ) : repository ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-400">
              Repository detected
            </p>
            <p className="text-xl font-semibold">
              {repository.owner}/{repository.name}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Open a GitHub repository to begin
          </p>
        )}
      </section>
    </main>
  );
}
