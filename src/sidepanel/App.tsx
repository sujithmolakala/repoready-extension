import { useRepoState } from "./useRepoState";

export default function App() {
  const { repository, isLoading } = useRepoState();

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 px-6 py-8 text-white">
      <h1 className="text-2xl font-semibold tracking-tight">RepoReady</h1>

      <section className="mt-8 flex flex-1 flex-col justify-center">
        {isLoading ? (
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
