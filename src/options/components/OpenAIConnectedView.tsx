interface OpenAIConnectedViewProps {
  validatedAt: string | null;
  onDisconnect: () => void;
}

export function OpenAIConnectedView({
  validatedAt,
  onDisconnect,
}: OpenAIConnectedViewProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-900">OpenAI connected</p>
        {validatedAt !== null ? (
          <p className="mt-1 text-xs text-emerald-800">
            Validated {new Date(validatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <p className="text-sm text-slate-600">
        Your API key is stored locally. RepoReady never displays the saved key
        after connection.
      </p>

      <button
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={onDisconnect}
        type="button"
      >
        Disconnect OpenAI
      </button>
    </section>
  );
}
