import type { PromptVaultDataset } from "@prompt-vault/types";

export const previewDatasetKey = "prompt-vault.preview.v1";
export const localePreferenceKey = "prompt-vault.locale";

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

export function saveLocalePreference(locale: string) {
  if (typeof document !== "undefined") {
    document.cookie = `pv-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(localePreferenceKey, locale);
  }
}
