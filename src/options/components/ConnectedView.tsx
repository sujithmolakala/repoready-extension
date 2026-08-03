interface ConnectedViewProps {
  username: string;
  avatarUrl: string | null;
  onDisconnect: () => void;
}

export function ConnectedView({
  username,
  avatarUrl,
  onDisconnect,
}: ConnectedViewProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              alt=""
              className="h-10 w-10 rounded-full"
              src={avatarUrl}
            />
          ) : null}
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Connected as {username}
            </p>
            <p className="text-sm text-emerald-700">
              Your token is stored locally on this device.
            </p>
          </div>
        </div>
      </div>

      <button
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={onDisconnect}
        type="button"
      >
        Disconnect GitHub
      </button>
    </section>
  );
}
