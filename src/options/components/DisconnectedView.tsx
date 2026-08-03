import { useState, type SubmitEvent } from "react";

import { AuthErrorMessage } from "./AuthErrorMessage";

interface DisconnectedViewProps {
  isValidating: boolean;
  errorMessage: string | null;
  onConnect: (token: string) => void;
  onClearError: () => void;
}

export function DisconnectedView({
  isValidating,
  errorMessage,
  onConnect,
  onClearError,
}: DisconnectedViewProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onConnect(token);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">Connect GitHub</h2>
        <p className="text-sm leading-6 text-slate-600">
          RepoReady needs GitHub access to read repository metadata for health
          analysis. Your token stays on this device and is never sent to a
          RepoReady backend.
        </p>
        <p className="text-sm leading-6 text-slate-600">
          Create a fine-grained personal access token with the narrowest
          repository permissions you are comfortable granting. Start with read
          access to the repositories you want to analyze.
        </p>
        <p className="text-sm text-slate-600">
          <a
            className="font-medium text-blue-600 underline hover:text-blue-700"
            href="https://github.com/settings/personal-access-tokens/new"
            rel="noreferrer"
            target="_blank"
          >
            Create a fine-grained GitHub PAT
          </a>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Personal access token
          </span>
          <div className="flex gap-2">
            <input
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={isValidating}
              name="github-token"
              onChange={(event) => {
                onClearError();
                setToken(event.target.value);
              }}
              placeholder="github_pat_..."
              spellCheck={false}
              type={showToken ? "text" : "password"}
              value={token}
            />
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isValidating}
              onClick={() => {
                setShowToken((current) => !current);
              }}
              type="button"
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {errorMessage ? <AuthErrorMessage message={errorMessage} /> : null}

        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isValidating || token.trim().length === 0}
          type="submit"
        >
          {isValidating ? "Validating…" : "Connect GitHub"}
        </button>
      </form>
    </section>
  );
}
