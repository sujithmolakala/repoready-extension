import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { DocumentType } from "../domain/models/documentType";
import { TabUiStateStore } from "../infrastructure/storage/TabUiStateStore";
import {
  createEmptyRepositoryUiState,
  type RepositoryUiState,
} from "../shared/models/tabUiState";

const SCROLL_SAVE_DEBOUNCE_MS = 200;

async function getCurrentTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;

  return tabId ?? null;
}

export function useTabUiState(repositoryKey: string | null) {
  const store = useMemo(() => new TabUiStateStore(), []);
  const [tabId, setTabId] = useState<number | null>(null);
  const [uiState, setUiState] = useState<RepositoryUiState>(
    createEmptyRepositoryUiState(),
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const scrollRestorePendingRef = useRef(false);
  const latestUiStateRef = useRef(uiState);

  useEffect(() => {
    latestUiStateRef.current = uiState;
  }, [uiState]);

  useEffect(() => {
    let cancelled = false;

    void getCurrentTabId().then((id) => {
      if (!cancelled) {
        setTabId(id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tabId === null || repositoryKey === null) {
      setIsHydrated(false);
      return;
    }

    let cancelled = false;

    void store.loadRepositoryUiState(tabId, repositoryKey).then((loaded) => {
      if (cancelled) {
        return;
      }

      setUiState(loaded);
      scrollRestorePendingRef.current = loaded.scrollTop > 0;
      setIsHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [repositoryKey, store, tabId]);

  const persistUiState = useCallback(
    (next: RepositoryUiState) => {
      if (tabId === null || repositoryKey === null) {
        return;
      }

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void store.saveRepositoryUiState(tabId, repositoryKey, next);
      }, SCROLL_SAVE_DEBOUNCE_MS);
    },
    [repositoryKey, store, tabId],
  );

  const updateUiState = useCallback(
    (
      updater:
        | RepositoryUiState
        | ((current: RepositoryUiState) => RepositoryUiState),
    ) => {
      setUiState((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        persistUiState(next);
        return next;
      });
    },
    [persistUiState],
  );

  useEffect(() => {
    if (!isHydrated || !scrollRestorePendingRef.current) {
      return;
    }

    let cancelled = false;
    const targetScrollTop = uiState.scrollTop;

    const restore = (): void => {
      if (cancelled) {
        return;
      }

      window.scrollTo({ top: targetScrollTop, behavior: "auto" });
      scrollRestorePendingRef.current = false;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(restore);
    });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, uiState.scrollTop, repositoryKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const handleScroll = (): void => {
      updateUiState((current) => ({
        ...current,
        scrollTop: window.scrollY,
      }));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }

      if (tabId !== null && repositoryKey !== null) {
        void store.saveRepositoryUiState(
          tabId,
          repositoryKey,
          latestUiStateRef.current,
        );
      }
    };
  }, [isHydrated, repositoryKey, store, tabId, updateUiState]);

  const toggleCategoryExpanded = useCallback(
    (categoryId: string) => {
      updateUiState((current) => {
        const expanded = new Set(current.expandedCategoryIds);

        if (expanded.has(categoryId)) {
          expanded.delete(categoryId);
        } else {
          expanded.add(categoryId);
        }

        return {
          ...current,
          expandedCategoryIds: [...expanded],
        };
      });
    },
    [updateUiState],
  );

  const toggleInsightSection = useCallback(
    (sectionId: string, open: boolean) => {
      updateUiState((current) => {
        const openSections = new Set(current.openInsightSectionIds);

        if (open) {
          openSections.add(sectionId);
        } else {
          openSections.delete(sectionId);
        }

        return {
          ...current,
          openInsightSectionIds: [...openSections],
        };
      });
    },
    [updateUiState],
  );

  const setSelectedDocumentType = useCallback(
    (documentType: DocumentType | null) => {
      updateUiState((current) => ({
        ...current,
        selectedDocumentType: documentType,
      }));
    },
    [updateUiState],
  );

  const setDocumentMode = useCallback(
    (documentMode: "preview" | "edit") => {
      updateUiState((current) => ({
        ...current,
        documentMode,
      }));
    },
    [updateUiState],
  );

  return {
    tabId,
    uiState,
    isHydrated,
    toggleCategoryExpanded,
    toggleInsightSection,
    setSelectedDocumentType,
    setDocumentMode,
  };
}
