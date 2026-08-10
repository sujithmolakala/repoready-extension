import { useCallback, useRef } from "react";

import { useAuthState } from "../shared/hooks/useAuthState";
import type { DocumentType } from "../domain/models/documentType";
import { MessageType } from "../shared/messages";
import { DebugFactsPanel, HealthScoreView } from "./components/HealthScoreView";
import { InsightsPanel } from "./components/InsightsPanel";
import { TrendPanel } from "./components/TrendPanel";
import { DocumentsView } from "./components/DocumentsView";
import { useHealthReport } from "./useHealthReport";
import { useRepoState } from "./useRepoState";
import { useRepositoryFacts } from "./useRepositoryFacts";
import { useTabUiState } from "./useTabUiState";

function openOptionsPage(): void {
  void chrome.runtime.openOptionsPage();
}

export default function App() {
  const { repository, isLoading: isRepoLoading } = useRepoState();
  const { authState, isLoading: isAuthLoading } = useAuthState();
  const {
    debugFacts,
    facts,
    isLoading: isFactsLoading,
    error: factsError,
    repositoryKey,
  } = useRepositoryFacts();
  const healthState = useHealthReport();
  const {
    report,
    insights,
    trend,
    isLoading: isHealthLoading,
    error: healthError,
    repositoryKey: healthRepositoryKey,
  } = healthState;
  const pendingFixDocumentType = useRef<DocumentType | null>(null);

  const activeRepositoryKey =
    repository !== null ? `${repository.owner}/${repository.name}` : repositoryKey;

  const {
    uiState,
    isHydrated,
    toggleCategoryExpanded,
    toggleInsightSection,
    setSelectedDocumentType,
    setDocumentMode,
  } = useTabUiState(activeRepositoryKey);

  const showHealthSection =
    repository &&
    authState.authenticated &&
    healthRepositoryKey === `${repository.owner}/${repository.name}`;

  const handleRefresh = (): void => {
    void chrome.runtime.sendMessage({ type: MessageType.REFRESH_REPOSITORY_FACTS });
  };

  const handleGenerateFix = useCallback(
    (documentType: DocumentType): void => {
      pendingFixDocumentType.current = documentType;
      setSelectedDocumentType(documentType);
      document.getElementById("documents-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [setSelectedDocumentType],
  );

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-slate-950 px-6 py-8 text-white">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">RepoReady</h1>
        {showHealthSection ? (
          <button
            className="shrink-0 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-60"
            disabled={isFactsLoading || isHealthLoading}
            onClick={handleRefresh}
            type="button"
          >
            {isFactsLoading ? "Refreshing…" : "Refresh analysis"}
          </button>
        ) : null}
      </div>

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

      {showHealthSection ? (
        <section className="mt-6 space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          {isFactsLoading ? (
            <p className="text-sm text-slate-400">Analyzing repository…</p>
          ) : null}
          {isHealthLoading || (report === null && healthError === null) ? (
            <p className="text-sm text-slate-400">
              Evaluating repository health…
            </p>
          ) : null}

          {healthError ? (
            <p className="text-sm text-red-300">{healthError}</p>
          ) : null}

          {report ? (
            <HealthScoreView
              expandedCategoryIds={uiState.expandedCategoryIds}
              onGenerateFix={handleGenerateFix}
              onToggleCategory={toggleCategoryExpanded}
              report={report}
            />
          ) : null}

          {trend ? <TrendPanel trend={trend} /> : null}

          {insights ? (
            <InsightsPanel
              insights={insights}
              onToggleSection={toggleInsightSection}
              openSectionIds={uiState.openInsightSectionIds}
            />
          ) : null}
        </section>
      ) : null}

      {showHealthSection && report && facts ? (
        <div id="documents-section">
          <DocumentsView
            facts={facts}
            initialDocumentType={pendingFixDocumentType.current}
            isUiHydrated={isHydrated}
            onDocumentModeChange={setDocumentMode}
            onInitialDocumentTypeConsumed={() => {
              pendingFixDocumentType.current = null;
            }}
            onSelectedDocumentTypeChange={setSelectedDocumentType}
            persistedDocumentMode={uiState.documentMode}
            persistedSelectedDocumentType={uiState.selectedDocumentType}
            report={report}
          />
        </div>
      ) : null}

      {repository && authState.authenticated && repositoryKey ? (
        <DebugFactsPanel
          debugFacts={debugFacts}
          error={factsError}
          isLoading={isFactsLoading}
        />
      ) : null}
    </main>
  );
}
