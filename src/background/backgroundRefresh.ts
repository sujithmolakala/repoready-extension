import { CollectRepositoryFactsUseCase } from "../application/CollectRepositoryFactsUseCase";
import { RepositoryFactsCacheStore } from "../infrastructure/storage/RepositoryFactsCacheStore";
import { PATAuthProvider } from "../infrastructure/auth/PATAuthProvider";
import { FactCollector } from "../infrastructure/github/FactCollector";
import { GitHubClient } from "../infrastructure/github/GitHubClient";

export const BACKGROUND_REFRESH_ALARM = "repoready-background-refresh";
export const BACKGROUND_REFRESH_INTERVAL_MINUTES = 180;
export const BACKGROUND_REFRESH_SETTINGS_KEY =
  "settings:backgroundRefreshEnabled";

export async function isBackgroundRefreshEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(BACKGROUND_REFRESH_SETTINGS_KEY);
  return result[BACKGROUND_REFRESH_SETTINGS_KEY] === true;
}

export async function setBackgroundRefreshEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({
    [BACKGROUND_REFRESH_SETTINGS_KEY]: enabled,
  });

  if (enabled) {
    await chrome.alarms.create(BACKGROUND_REFRESH_ALARM, {
      periodInMinutes: BACKGROUND_REFRESH_INTERVAL_MINUTES,
    });
  } else {
    await chrome.alarms.clear(BACKGROUND_REFRESH_ALARM);
  }
}

export function registerBackgroundRefreshListener(
  collectRepositoryFactsUseCase: CollectRepositoryFactsUseCase,
  cacheStore: RepositoryFactsCacheStore,
  authProvider: PATAuthProvider,
): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== BACKGROUND_REFRESH_ALARM) {
      return;
    }

    void runBackgroundRefresh(collectRepositoryFactsUseCase, cacheStore, authProvider);
  });
}

async function runBackgroundRefresh(
  collectRepositoryFactsUseCase: CollectRepositoryFactsUseCase,
  cacheStore: RepositoryFactsCacheStore,
  authProvider: PATAuthProvider,
): Promise<void> {
  const enabled = await isBackgroundRefreshEnabled();

  if (!enabled) {
    return;
  }

  const authenticated = await authProvider.isAuthenticated();

  if (!authenticated) {
    return;
  }

  const repositoryKeys = await cacheStore.listRecentRepositoryKeys();

  for (const repositoryKey of repositoryKeys.slice(0, 5)) {
    const parts = repositoryKey.split("/");

    if (parts.length < 2) {
      continue;
    }

    const owner = parts[0];
    const repo = parts[1];

    if (owner.length === 0 || repo.length === 0) {
      continue;
    }

    try {
      await collectRepositoryFactsUseCase.execute({ owner, name: repo });
    } catch {
      // Skip failed refreshes silently to honor rate limits and avoid noise.
    }
  }
}

export function createBackgroundRefreshServices(
  authProvider: PATAuthProvider,
  factCollector: FactCollector,
  githubClient: GitHubClient,
  cacheStore: RepositoryFactsCacheStore,
): CollectRepositoryFactsUseCase {
  const collectRepositoryFactsUseCase = new CollectRepositoryFactsUseCase(
    factCollector,
    authProvider,
    githubClient,
    cacheStore,
  );

  registerBackgroundRefreshListener(
    collectRepositoryFactsUseCase,
    cacheStore,
    authProvider,
  );

  return collectRepositoryFactsUseCase;
}
