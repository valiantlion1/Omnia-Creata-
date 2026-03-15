const TOKEN_KEY = 'oc-studio-access-token'

export function getStudioAccessToken() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)
}

export function setStudioAccessToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
  window.dispatchEvent(new Event('oc-studio-auth'))
}

export function clearStudioAccessToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event('oc-studio-auth'))
}
