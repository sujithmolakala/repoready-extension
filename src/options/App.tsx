import { useEffect, useState } from "react";
import { ConnectedView } from "./components/ConnectedView";
import { DisconnectedView } from "./components/DisconnectedView";
import { OpenAIConnectedView } from "./components/OpenAIConnectedView";
import { OpenAIDisconnectedView } from "./components/OpenAISettingsSection";
import { useAuthActions } from "./useAuthActions";
import { useOpenAIActions } from "./useOpenAIActions";
import {
  BACKGROUND_REFRESH_SETTINGS_KEY,
  setBackgroundRefreshEnabled,
} from "../background/backgroundRefresh";
import { useOpenAIConfig } from "../shared/hooks/useOpenAIConfig";
import { useAuthState } from "../shared/hooks/useAuthState";

export default function App() {
  const { authState, isLoading } = useAuthState();
  const { openAIConfig, isLoading: isOpenAILoading } = useOpenAIConfig();
  const { isValidating, error, connectGitHub, disconnectGitHub, clearError } =
    useAuthActions();
  const {
    isValidating: isOpenAIValidating,
    error: openAIError,
    connectOpenAI,
    disconnectOpenAI,
    clearError: clearOpenAIError,
  } = useOpenAIActions();

  const [backgroundRefreshEnabled, setBackgroundRefreshEnabledState] =
    useState(false);

  useEffect(() => {
    void chrome.storage.local
      .get(BACKGROUND_REFRESH_SETTINGS_KEY)
      .then((result) => {
        setBackgroundRefreshEnabledState(
          result[BACKGROUND_REFRESH_SETTINGS_KEY] === true,
        );
      });
  }, []);

  const handleBackgroundRefreshToggle = (enabled: boolean): void => {
    setBackgroundRefreshEnabledState(enabled);
    void setBackgroundRefreshEnabled(enabled);
  };

  const handleConnect = (token: string): void => {
    void connectGitHub(token);
  };

  const handleDisconnect = (): void => {
    void disconnectGitHub();
  };

  const handleOpenAIConnect = (apiKey: string): void => {
    void connectOpenAI(apiKey);
  };

  const handleOpenAIDisconnect = (): void => {
    void disconnectOpenAI();
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">RepoReady Settings</h1>
      <p className="mt-2 text-sm text-slate-600">
        Manage GitHub authentication and optional OpenAI integration.
      </p>

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="text-base font-medium text-slate-900">GitHub</h2>
          <div className="mt-4">
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
        </section>

        <section>
          <h2 className="text-base font-medium text-slate-900">OpenAI</h2>
          <div className="mt-4">
            {isOpenAILoading ? (
              <p className="text-sm text-slate-500">Loading OpenAI status…</p>
            ) : openAIConfig.configured ? (
              <OpenAIConnectedView
                onDisconnect={handleOpenAIDisconnect}
                validatedAt={openAIConfig.validatedAt}
              />
            ) : (
              <OpenAIDisconnectedView
                errorMessage={openAIError?.message ?? null}
                isValidating={isOpenAIValidating}
                onClearError={clearOpenAIError}
                onConnect={handleOpenAIConnect}
              />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-base font-medium text-slate-900">Performance</h2>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <label className="flex items-start gap-3">
              <input
                checked={backgroundRefreshEnabled}
                className="mt-1"
                onChange={(event) => {
                  handleBackgroundRefreshToggle(event.target.checked);
                }}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Background repository refresh
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  Off by default. When enabled, RepoReady periodically refreshes
                  recently analyzed repositories every few hours. No AI calls or
                  GitHub writes are performed.
                </span>
              </span>
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}
