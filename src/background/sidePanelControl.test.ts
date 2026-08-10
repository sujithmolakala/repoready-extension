import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SidePanelControl,
  SIDE_PANEL_PATH,
  logEffectiveSidePanelOptions,
  registerSidePanelControl,
} from "./sidePanelControl";
import { TabUiStateStore } from "../infrastructure/storage/TabUiStateStore";

describe("SidePanelControl", () => {
  const setOptions = vi.fn(async () => undefined);
  const open = vi.fn(async () => undefined);
  const getOptions = vi.fn(async () => ({
    enabled: true,
    path: SIDE_PANEL_PATH,
  }));
  const query = vi.fn(async () => [{ id: 1 }, { id: 2 }]);
  const onClickedAddListener = vi.fn();
  const sessionGet = vi.fn(async () => ({}));
  const sessionSet = vi.fn(async () => undefined);
  const markTabOpened = vi.fn(async () => undefined);

  beforeEach(() => {
    setOptions.mockReset().mockResolvedValue(undefined);
    open.mockReset().mockResolvedValue(undefined);
    getOptions.mockReset();
    query.mockReset().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    onClickedAddListener.mockReset();
    sessionGet.mockReset().mockResolvedValue({});
    sessionSet.mockReset().mockResolvedValue(undefined);
    markTabOpened.mockReset().mockResolvedValue(undefined);

    getOptions.mockResolvedValue({
      enabled: true,
      path: SIDE_PANEL_PATH,
    });

    vi.stubGlobal("chrome", {
      sidePanel: { setOptions, open, getOptions },
      tabs: { query, onCreated: { addListener: vi.fn() } },
      action: { onClicked: { addListener: onClickedAddListener } },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() },
      },
      storage: {
        session: {
          get: sessionGet,
          set: sessionSet,
          remove: vi.fn(async () => undefined),
        },
      },
    });
  });

  it("registers chrome.action.onClicked synchronously during initialization", () => {
    registerSidePanelControl(new SidePanelControl(new TabUiStateStore()));

    expect(onClickedAddListener).toHaveBeenCalledTimes(1);
    expect(typeof onClickedAddListener.mock.calls[0]?.[0]).toBe("function");
    expect(sessionGet).not.toHaveBeenCalled();
  });

  it("configures panel availability with the built runtime path", async () => {
    const control = new SidePanelControl(new TabUiStateStore());

    await control.configurePanelAvailability(7);

    expect(setOptions).toHaveBeenCalledWith({
      tabId: 7,
      path: SIDE_PANEL_PATH,
      enabled: true,
    });
    expect(getOptions).toHaveBeenCalledWith({ tabId: 7 });
  });

  it("does not perform asynchronous Chrome API work before sidePanel.open", () => {
    const store = new TabUiStateStore();
    vi.spyOn(store, "markTabOpened").mockImplementation(markTabOpened);
    const control = new SidePanelControl(store);
    const callOrder: string[] = [];
    open.mockImplementation(async () => {
      callOrder.push("open");
    });
    getOptions.mockImplementation(async () => {
      callOrder.push("getOptions");
      return { enabled: true, path: SIDE_PANEL_PATH };
    });
    setOptions.mockImplementation(async () => {
      callOrder.push("setOptions");
    });
    sessionGet.mockImplementation(async () => {
      callOrder.push("storage.get");
      return {};
    });
    sessionSet.mockImplementation(async () => {
      callOrder.push("storage.set");
    });

    control.handleActionClick({ id: 2 } as chrome.tabs.Tab);

    expect(open).toHaveBeenCalledWith({ tabId: 2 });
    expect(callOrder).toEqual(["open"]);
    expect(getOptions).not.toHaveBeenCalled();
    expect(setOptions).not.toHaveBeenCalled();
    expect(sessionGet).not.toHaveBeenCalled();
    expect(sessionSet).not.toHaveBeenCalled();
    expect(markTabOpened).not.toHaveBeenCalled();
  });

  it("persists tab-open state only after open succeeds", async () => {
    const store = new TabUiStateStore();
    vi.spyOn(store, "markTabOpened").mockImplementation(markTabOpened);
    const control = new SidePanelControl(store);

    control.handleActionClick({ id: 2 } as chrome.tabs.Tab);

    expect(markTabOpened).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(markTabOpened).toHaveBeenCalledWith(2);
    });
  });

  it("does not persist tab-open state when open fails", async () => {
    const store = new TabUiStateStore();
    vi.spyOn(store, "markTabOpened").mockImplementation(markTabOpened);
    open.mockRejectedValueOnce(new Error("open failed"));
    const control = new SidePanelControl(store);

    control.handleActionClick({ id: 5 } as chrome.tabs.Tab);

    await vi.waitFor(() => {
      expect(open).toHaveBeenCalledWith({ tabId: 5 });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(markTabOpened).not.toHaveBeenCalled();
  });

  it("does nothing when tab.id is missing", () => {
    const control = new SidePanelControl(new TabUiStateStore());

    control.handleActionClick({} as chrome.tabs.Tab);

    expect(setOptions).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("restores availability only for tabs with repository state", async () => {
    const control = new SidePanelControl(new TabUiStateStore());

    await control.restoreAvailability((tabId) => tabId === 1);

    expect(setOptions).toHaveBeenCalledWith({
      tabId: 1,
      path: SIDE_PANEL_PATH,
      enabled: true,
    });
    expect(setOptions).not.toHaveBeenCalledWith(
      expect.objectContaining({ tabId: 2 }),
    );
  });

  it("does not call setPanelBehavior", () => {
    expect(chrome.sidePanel).not.toHaveProperty("setPanelBehavior");
  });

  it("logs effective options via getOptions", async () => {
    getOptions.mockResolvedValueOnce({
      enabled: true,
      path: SIDE_PANEL_PATH,
    });

    const options = await logEffectiveSidePanelOptions(3, "test");

    expect(getOptions).toHaveBeenCalledWith({ tabId: 3 });
    expect(options.enabled).toBe(true);
    expect(options.path).toBe(SIDE_PANEL_PATH);
  });

  it("disables the panel when a tab is removed", async () => {
    const control = new SidePanelControl(new TabUiStateStore());

    await control.handleTabRemoved(9);

    expect(setOptions).toHaveBeenCalledWith({
      tabId: 9,
      enabled: false,
    });
  });
});

describe("side panel build assumptions", () => {
  it("uses the manifest default side panel path constant", () => {
    expect(SIDE_PANEL_PATH).toBe("src/sidepanel/index.html");
  });
});
