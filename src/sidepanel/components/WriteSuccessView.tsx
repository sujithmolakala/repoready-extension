import type { CreatePullRequestResult } from "../../domain/github/writeTypes";

export function WriteSuccessView({
  result,
  onDismiss,
}: {
  result: CreatePullRequestResult;
  onDismiss: () => void;
}) {
  return (
    <section
      className="rounded-md border border-emerald-900/50 bg-emerald-950/20 p-4"
      data-testid="write-success-view"
    >
      <h3 className="text-sm font-medium text-emerald-100">Pull Request Created</h3>
      <dl className="mt-3 space-y-2 text-xs text-emerald-50">
        <div>
          <dt className="text-emerald-300/80">PR title</dt>
          <dd>{result.pullRequestTitle}</dd>
        </div>
        <div>
          <dt className="text-emerald-300/80">PR number</dt>
          <dd>#{result.pullRequestNumber}</dd>
        </div>
        <div>
          <dt className="text-emerald-300/80">Branch</dt>
          <dd className="font-mono">{result.branchName}</dd>
        </div>
        <div>
          <dt className="text-emerald-300/80">Repository</dt>
          <dd>
            {result.owner}/{result.repo}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-slate-200"
          data-testid="open-pull-request-button"
          href={result.pullRequestUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open Pull Request
        </a>
        <button
          className="rounded-md border border-emerald-800 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:border-emerald-600"
          onClick={onDismiss}
          type="button"
        >
          Done
        </button>
      </div>
    </section>
  );
}
