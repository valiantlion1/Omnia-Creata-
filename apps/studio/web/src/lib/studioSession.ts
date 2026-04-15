let memoryToken: string | null = null;
let memoryPostAuthRedirect: string | null = null;
export const DEFAULT_STUDIO_REDIRECT_PATH = '/explore';

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

export function setStudioPostAuthRedirect(path: string) {
  memoryPostAuthRedirect = sanitizeStudioRedirectPath(path);
}

export function getStudioPostAuthRedirect() {
  return memoryPostAuthRedirect;
}

export function consumeStudioPostAuthRedirect() {
  const value = memoryPostAuthRedirect;
  memoryPostAuthRedirect = null;
  return value ? sanitizeStudioRedirectPath(value) : null;
}
