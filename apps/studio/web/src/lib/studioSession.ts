const TOKEN_KEY = 'oc-studio-access-token'
const POST_AUTH_REDIRECT_KEY = 'oc-studio-post-auth-redirect'

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

export function setStudioPostAuthRedirect(path: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(POST_AUTH_REDIRECT_KEY, path)
}

export function getStudioPostAuthRedirect() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(POST_AUTH_REDIRECT_KEY)
}

export function consumeStudioPostAuthRedirect() {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(POST_AUTH_REDIRECT_KEY)
  if (value) {
    window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY)
  }
  return value
}
