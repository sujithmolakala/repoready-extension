import type { ReactNode } from "react";
import type { WritePlan } from "../../domain/github/writeTypes";

export interface ApprovalDrawerValues {
  destinationPath: string;
  branchName: string;
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
}

export function ApprovalDrawer({
  plan,
  values,
  isSubmitting,
  errorMessage,
  onChange,
  onCancel,
  onConfirm,
}: {
  plan: WritePlan;
  values: ApprovalDrawerValues;
  isSubmitting: boolean;
  errorMessage: string | null;
  onChange: (values: ApprovalDrawerValues) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section
      className="rounded-md border border-blue-900/50 bg-slate-950/90 p-4"
      data-testid="approval-drawer"
    >
      <h3 className="text-sm font-medium text-slate-100">Review before creating pull request</h3>
      <p className="mt-2 rounded-md border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
        Nothing has been written yet. RepoReady will create a new branch and open a
        pull request only after you confirm.
      </p>

      <dl className="mt-4 space-y-3 text-xs">
        <ReviewField label="Destination file">
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-200"
            data-testid="approval-destination-path"
            onChange={(event) => {
              onChange({ ...values, destinationPath: event.target.value });
            }}
            value={values.destinationPath}
          />
        </ReviewField>

        <ReviewField label="Action">
          <p className="mt-1 text-slate-300" data-testid="approval-file-action">
            {plan.fileActionLabel}
          </p>
        </ReviewField>

        <ReviewField label="Branch">
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-200"
            data-testid="approval-branch-name"
            onChange={(event) => {
              onChange({ ...values, branchName: event.target.value });
            }}
            value={values.branchName}
          />
        </ReviewField>

        <ReviewField label="Commit message">
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            data-testid="approval-commit-message"
            onChange={(event) => {
              onChange({ ...values, commitMessage: event.target.value });
            }}
            value={values.commitMessage}
          />
        </ReviewField>

        <ReviewField label="PR title">
          <input
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            data-testid="approval-pr-title"
            onChange={(event) => {
              onChange({ ...values, pullRequestTitle: event.target.value });
            }}
            value={values.pullRequestTitle}
          />
        </ReviewField>

        <ReviewField label="PR body">
          <textarea
            className="mt-1 h-32 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            data-testid="approval-pr-body"
            onChange={(event) => {
              onChange({ ...values, pullRequestBody: event.target.value });
            }}
            value={values.pullRequestBody}
          />
        </ReviewField>
      </dl>

      {errorMessage ? (
        <p
          className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-200"
          data-testid="approval-error"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="approval-cancel-button"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="approval-create-pr-button"
          disabled={isSubmitting}
          onClick={onConfirm}
          type="button"
        >
          {isSubmitting ? "Creating pull request…" : "Create Pull Request"}
        </button>
      </div>
    </section>
  );
}

function ReviewField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="font-medium text-slate-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
