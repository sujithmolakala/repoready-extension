import { TabUiStateStore } from "../infrastructure/storage/TabUiStateStore";

/** Must match manifest.config.ts `side_panel.default_path`. */
export const SIDE_PANEL_PATH = "src/sidepanel/index.html";

const LOG_PREFIX = "[RepoReady SidePanel]";

function logSidePanelEvent(
  phase: string,
  details: Record<string, string | number | boolean | undefined>,
): void {
  console.info(LOG_PREFIX, { phase, ...details });
}

function logSidePanelError(
  phase: string,
  details: Record<string, string | number | boolean | undefined>,
): void {
  console.error(LOG_PREFIX, { phase, ...details });
}

function logSidePanelApiAvailability(): void {
  console.info(LOG_PREFIX, {
    phase: "api-availability",
    sidePanel: typeof chrome.sidePanel,
    sidePanelOpen: typeof chrome.sidePanel.open,
    sidePanelSetOptions: typeof chrome.sidePanel.setOptions,
    sidePanelGetOptions: typeof chrome.sidePanel.getOptions,
    actionOnClicked: typeof chrome.action.onClicked,
  });
}

export async function logEffectiveSidePanelOptions(
  tabId: number,
  context: string,
): Promise<chrome.sidePanel.PanelOptions> {
  const options = await chrome.sidePanel.getOptions({ tabId });
  console.info(`${LOG_PREFIX} effective-options`, {
    context,
    tabId,
    enabled: options.enabled,
    path: options.path,
  });
  logSidePanelEvent("effective-options", {
    context,
    tabId,
    enabled: options.enabled,
    path: options.path,
  });
  return options;
}

export class SidePanelControl {
  constructor(private readonly tabUiStateStore: TabUiStateStore) {}

  /**
   * Makes RepoReady available on a tab without opening it.
   * Called when a GitHub repository is detected, not on toolbar click.
   */
  async configurePanelAvailability(tabId: number): Promise<void> {
    logSidePanelEvent("configure-availability", {
      tabId,
      path: SIDE_PANEL_PATH,
      enabled: true,
    });

    await chrome.sidePanel.setOptions({
      tabId,
      path: SIDE_PANEL_PATH,
      enabled: true,
    });

    await logEffectiveSidePanelOptions(tabId, "after-configure");
  }

  /**
   * Re-enable panel availability for tabs that already have repo state
   * after service-worker restart.
   */
  async restoreAvailability(
    hasRepository: (tabId: number) => boolean,
  ): Promise<void> {
    logSidePanelEvent("restore-availability-start", {});

    const tabs = await chrome.tabs.query({});
    const repoTabs = tabs.filter(
      (tab) => tab.id !== undefined && hasRepository(tab.id),
    );

    await Promise.all(
      repoTabs.map(async (tab) => {
        if (tab.id === undefined) {
          return;
        }

        await this.configurePanelAvailability(tab.id);
      }),
    );

    logSidePanelEvent("restore-availability-complete", {
      tabCount: repoTabs.length,
    });
  }

  /** Toolbar click only opens a panel configured earlier by REPO_DETECTED. */
  handleActionClick(tab: chrome.tabs.Tab): void {
    if (typeof tab.id !== "number") {
      console.warn(`${LOG_PREFIX} click without tab id`);
      logSidePanelEvent("action-click-skipped", { reason: "missing-tab-id" });
      return;
    }

    const tabId = tab.id;
    console.info(`${LOG_PREFIX} ACTION CLICK`, { tabId });
    logSidePanelEvent("action-click-received", { tabId });

    console.info(`${LOG_PREFIX} opening`, { tabId });
    void chrome.sidePanel
      .open({ tabId })
      .then(() => {
        console.info(`${LOG_PREFIX} open success`, { tabId });
        logSidePanelEvent("open-succeeded", { tabId });

        return this.tabUiStateStore.markTabOpened(tabId);
      })
      .catch((error: unknown) => {
        logSidePanelError("open-failed", {
          tabId,
          error:
            error instanceof Error ? error.message : String(error),
        });
      });
  }

  async handleTabRemoved(tabId: number): Promise<void> {
    await this.tabUiStateStore.unmarkTabOpened(tabId);
    await this.tabUiStateStore.clearTabUiState(tabId);

    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    });
  }
}

export function registerSidePanelControl(
  sidePanelControl: SidePanelControl,
  onStartup?: () => void,
): void {
  logSidePanelEvent("initializing", {});
  logSidePanelApiAvailability();

  chrome.runtime.onInstalled.addListener(() => {
    onStartup?.();
  });

  chrome.runtime.onStartup.addListener(() => {
    onStartup?.();
  });

  chrome.action.onClicked.addListener((tab) => {
    sidePanelControl.handleActionClick(tab);
  });

  logSidePanelEvent("action-listener-registered", {});
}

export { logSidePanelEvent, logSidePanelError, LOG_PREFIX };
