let memoryToken: string | null = null;
let memoryPostAuthRedirect: string | null = null;
export const DEFAULT_STUDIO_REDIRECT_PATH = '/explore';
const POST_AUTH_REDIRECT_STORAGE_KEY = 'oc-studio-post-auth-redirect';

export function sanitizeStudioRedirectPath(path: string | null | undefined, fallback = DEFAULT_STUDIO_REDIRECT_PATH) {
  if (typeof path !== 'string') {
    return fallback;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  try {
    const normalized = new URL(trimmed, 'https://studio.local');
    if (normalized.origin !== 'https://studio.local') {
      return fallback;
    }

    const nextPath = `${normalized.pathname}${normalized.search}${normalized.hash}`;
    return nextPath.startsWith('/') ? nextPath : fallback;
  } catch {
    return fallback;
  }
}

export function getStudioAccessToken() {
  return memoryToken;
}

export function setStudioAccessToken(token: string) {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('oc-studio-auth'));
  }
}

export function clearStudioAccessToken() {
  memoryToken = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('oc-studio-auth'));
  }
}

function readStoredPostAuthRedirect() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredPostAuthRedirect(path: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (path) {
      window.sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, path);
    } else {
      window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
    }
  } catch {
    // Best effort only; auth redirect should still work in-memory if storage is unavailable.
  }
}

export function setStudioPostAuthRedirect(path: string) {
  const safePath = sanitizeStudioRedirectPath(path);
  memoryPostAuthRedirect = safePath;
  writeStoredPostAuthRedirect(safePath);
}

export function getStudioPostAuthRedirect() {
  const stored = readStoredPostAuthRedirect();
  if (stored) {
    const safeStored = sanitizeStudioRedirectPath(stored);
    memoryPostAuthRedirect = safeStored;
    return safeStored;
  }
  return memoryPostAuthRedirect ? sanitizeStudioRedirectPath(memoryPostAuthRedirect) : null;
}

export function consumeStudioPostAuthRedirect() {
  const value = getStudioPostAuthRedirect();
  memoryPostAuthRedirect = null;
  writeStoredPostAuthRedirect(null);
  return value ? sanitizeStudioRedirectPath(value) : null;
}
