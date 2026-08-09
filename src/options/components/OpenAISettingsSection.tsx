import { useState, type SubmitEvent } from "react";

interface OpenAIDisconnectedViewProps {
  isValidating: boolean;
  errorMessage: string | null;
  onConnect: (apiKey: string) => void;
  onClearError: () => void;
}

export function OpenAIDisconnectedView({
  isValidating,
  errorMessage,
  onConnect,
  onClearError,
}: OpenAIDisconnectedViewProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onConnect(apiKey);
    setApiKey("");
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-slate-900">Connect OpenAI</h3>
        <p className="text-sm leading-6 text-slate-600">
          Optional: enable AI-assisted document drafts. Your OpenAI API key stays
          on this device in local extension storage and is never sent to a
          RepoReady backend.
        </p>
        <p className="text-sm leading-6 text-slate-600">
          AI generation sends selected repository facts to OpenAI only when you
          click Generate with AI in the side panel.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">OpenAI API key</span>
          <div className="flex gap-2">
            <input
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={isValidating}
              name="openai-api-key"
              onChange={(event) => {
                onClearError();
                setApiKey(event.target.value);
              }}
              placeholder="sk-..."
              spellCheck={false}
              type={showKey ? "text" : "password"}
              value={apiKey}
            />
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isValidating}
              onClick={() => {
                setShowKey((current) => !current);
              }}
              type="button"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isValidating || apiKey.trim().length === 0}
          type="submit"
        >
          {isValidating ? "Validating…" : "Save API Key"}
        </button>
      </form>
    </section>
  );
}
