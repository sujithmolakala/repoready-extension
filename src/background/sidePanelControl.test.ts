import { beforeEach, describe, expect, it, vi } from "vitest";

import { SidePanelControl, SIDE_PANEL_PATH } from "./sidePanelControl";
import { TabUiStateStore } from "../infrastructure/storage/TabUiStateStore";

describe("SidePanelControl", () => {
  const setOptions = vi.fn(async () => undefined);
  const open = vi.fn(async () => undefined);
  const setPanelBehavior = vi.fn(async () => undefined);
  const query = vi.fn(async () => [{ id: 1 }, { id: 2 }]);

  beforeEach(() => {
    setOptions.mockClear();
    open.mockClear();
    setPanelBehavior.mockClear();
    query.mockClear();

    vi.stubGlobal("chrome", {
      sidePanel: { setOptions, open, setPanelBehavior },
      tabs: { query },
      action: { onClicked: { addListener: vi.fn() } },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() },
      },
      storage: {
        session: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
          remove: vi.fn(async () => undefined),
        },
      },
    });
  });

  it("enables the side panel only for the clicked tab", async () => {
    const control = new SidePanelControl(new TabUiStateStore());

    await control.handleActionClick({ id: 2 } as chrome.tabs.Tab);

    expect(setOptions).toHaveBeenCalledWith({
      tabId: 2,
      path: SIDE_PANEL_PATH,
      enabled: true,
    });
    expect(open).toHaveBeenCalledWith({ tabId: 2 });
  });

  it("disables side panel for newly created tabs", async () => {
    const control = new SidePanelControl(new TabUiStateStore());

    await control.handleTabCreated(99);

    expect(setOptions).toHaveBeenCalledWith({
      tabId: 99,
      path: SIDE_PANEL_PATH,
      enabled: false,
    });
  });

  it("restores opened tabs on initialize", async () => {
    const store = new TabUiStateStore();
    vi.spyOn(store, "getOpenedTabIds").mockResolvedValue([1]);

    const control = new SidePanelControl(store);
    await control.initialize();

    expect(setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: false });
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 1,
      path: SIDE_PANEL_PATH,
      enabled: true,
    });
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 2,
      path: SIDE_PANEL_PATH,
      enabled: false,
    });
  });
});
