import type { OfflineMutationRecord, PromptVaultDataset } from "@prompt-vault/types";

export const previewDatasetKey = "prompt-vault.preview.v1";
export const localePreferenceKey = "prompt-vault.locale";
export const previewSyncQueueKey = "prompt-vault.sync-queue.v1";
export const introStateKey = "prompt-vault.intro.v1";
export const introSessionKey = "prompt-vault.intro.session";

export interface IntroStateRecord {
  hasSeenWelcome: boolean;
  hasCompletedIntro: boolean;
  authDeferred: boolean;
  hasSeenOffers: boolean;
}

const defaultIntroState: IntroStateRecord = {
  hasSeenWelcome: false,
  hasCompletedIntro: false,
  authDeferred: false,
  hasSeenOffers: false
};

export function loadPreviewDataset() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(previewDatasetKey);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as PromptVaultDataset;
  } catch {
    return null;
  }
}

export function savePreviewDataset(dataset: PromptVaultDataset) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(previewDatasetKey, JSON.stringify(dataset));
}

export function loadPreviewSyncQueue() {
  if (typeof window === "undefined") {
    return [] as OfflineMutationRecord[];
  }

  const stored = window.localStorage.getItem(previewSyncQueueKey);
  if (!stored) {
    return [] as OfflineMutationRecord[];
  }

  try {
    return JSON.parse(stored) as OfflineMutationRecord[];
  } catch {
    return [] as OfflineMutationRecord[];
  }
}

export function savePreviewSyncQueue(queue: OfflineMutationRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(previewSyncQueueKey, JSON.stringify(queue));
}

export function saveLocalePreference(locale: string) {
  if (typeof document !== "undefined") {
    document.cookie = `pv-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(localePreferenceKey, locale);
  }
}

export function loadIntroState() {
  if (typeof window === "undefined") {
    return defaultIntroState;
  }

  const stored = window.localStorage.getItem(introStateKey);
  if (!stored) {
    return defaultIntroState;
  }

  try {
    return {
      ...defaultIntroState,
      ...(JSON.parse(stored) as Partial<IntroStateRecord>)
    };
  } catch {
    return defaultIntroState;
  }
}

export function saveIntroState(state: IntroStateRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(introStateKey, JSON.stringify(state));
}

export function hasSeenSessionSplash() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(introSessionKey) === "1";
}

export function markSessionSplashSeen() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(introSessionKey, "1");
}
