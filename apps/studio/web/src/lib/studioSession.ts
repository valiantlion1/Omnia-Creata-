let memoryToken: string | null = null;
let memoryPostAuthRedirect: string | null = null;

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
  memoryPostAuthRedirect = path;
}

export function getStudioPostAuthRedirect() {
  return memoryPostAuthRedirect;
}

export function consumeStudioPostAuthRedirect() {
  const value = memoryPostAuthRedirect;
  memoryPostAuthRedirect = null;
  return value;
}
