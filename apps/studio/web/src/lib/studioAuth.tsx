import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { logAuthTrace } from '@/lib/authTrace'
import { studioApi, type AuthMeResponse, type IdentityPlan } from '@/lib/studioApi'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  clearStudioAccessToken,
  consumeStudioPostAuthRedirect,
  getStudioAccessToken,
  setStudioAccessToken,
  setStudioPostAuthRedirect,
} from '@/lib/studioSession'

type SignupInput = {
  displayName: string
  username: string
  email: string
  password: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  acceptedUsagePolicy: boolean
  marketingOptIn: boolean
}

type StudioAuthContextValue = {
  auth: AuthMeResponse | undefined
  isLoading: boolean
  isAuthSyncing: boolean
  isAuthenticated: boolean
  completeOAuthSignIn: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignupInput) => Promise<void>
  signInWithProvider: (provider: 'google' | 'facebook' | 'apple' | 'twitter', nextPath?: string) => Promise<void>
  signInDemo: (plan?: IdentityPlan, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
  consumeRedirectAfterAuth: () => string | null
}

const StudioAuthContext = React.createContext<StudioAuthContextValue | null>(null)
const AUTH_SNAPSHOT_KEY = 'oc-studio-auth-snapshot'
const AUTH_ME_RETRY_DELAYS_MS = [0, 150, 400, 1000]
const OAUTH_SESSION_RETRY_DELAYS_MS = [0, 150, 400, 1000, 2000]
const OAUTH_AUTH_SYNC_RETRY_DELAYS_MS = [250, 750, 1500]
let oauthCompletionKeyInFlight: string | null = null
let oauthCompletionPromiseInFlight: Promise<void> | null = null

function readAuthSnapshot() {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem(AUTH_SNAPSHOT_KEY)
  if (!raw) return undefined

  try {
    return JSON.parse(raw) as AuthMeResponse
  } catch {
    window.localStorage.removeItem(AUTH_SNAPSHOT_KEY)
    return undefined
  }
}

function writeAuthSnapshot(value: AuthMeResponse | null) {
  if (typeof window === 'undefined') return
  if (!value) {
    window.localStorage.removeItem(AUTH_SNAPSHOT_KEY)
    return
  }

  window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(value))
}

async function syncBrowserSession(accessToken: string, refreshToken?: string) {
  if (!refreshToken) return
  await supabaseBrowser.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
}

function isRecoverableSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /invalid or expired session|invalid token|token has expired/i.test(message)
}

async function wait(delayMs: number) {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs))
}

function readOAuthCallbackError() {
  if (typeof window === 'undefined') return null
  const currentUrl = new URL(window.location.href)
  const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''))
  const errorCode = currentUrl.searchParams.get('error') ?? hashParams.get('error')
  const errorDescription =
    currentUrl.searchParams.get('error_description') ?? hashParams.get('error_description')

  if (!errorCode && !errorDescription) return null
  return decodeURIComponent(errorDescription ?? errorCode ?? 'Google sign-in failed.')
}

function clearOAuthCallbackUrl() {
  if (typeof window === 'undefined') return
  const currentUrl = new URL(window.location.href)
  const paramsToStrip = [
    'oauth',
    'code',
    'error',
    'error_code',
    'error_description',
    'provider_token',
    'provider_refresh_token',
    'state',
  ]
  let mutated = false
  for (const key of paramsToStrip) {
    if (currentUrl.searchParams.has(key)) {
      currentUrl.searchParams.delete(key)
      mutated = true
    }
  }

  const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''))
  let nextHash = ''
  for (const key of paramsToStrip.concat(['access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type'])) {
    if (hashParams.has(key)) {
      hashParams.delete(key)
      mutated = true
    }
  }
  if (hashParams.toString()) {
    nextHash = `#${hashParams.toString()}`
  } else if (currentUrl.hash) {
    mutated = true
  }

  if (!mutated) return
  const nextSearch = currentUrl.searchParams.toString()
  const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${nextHash}`
  window.history.replaceState({}, document.title, nextUrl)
}

function getOAuthCallbackKey() {
  if (typeof window === 'undefined') return 'server'
  const currentUrl = new URL(window.location.href)
  return `${currentUrl.pathname}?${currentUrl.searchParams.toString()}#${currentUrl.hash.replace(/^#/, '')}`
}

function getOAuthRedirectUrl() {
  const localOriginPattern = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i

  if (typeof window !== 'undefined' && localOriginPattern.test(window.location.origin)) {
    return `${window.location.origin.replace(/\/$/, '')}/login?oauth=1`
  }

  const configuredBaseUrl = import.meta.env.VITE_AUTH_REDIRECT_BASE_URL?.trim()
  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, '')}/login?oauth=1`
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5173/login?oauth=1'
  }

  return `${window.location.origin}/login?oauth=1`
}

function isOAuthCallbackUrl() {
  if (typeof window === 'undefined') return false
  const currentUrl = new URL(window.location.href)
  const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''))
  return (
    currentUrl.searchParams.get('oauth') === '1' ||
    currentUrl.searchParams.has('code') ||
    currentUrl.searchParams.has('error') ||
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    hashParams.has('error')
  )
}

export function StudioAuthProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient()
  const [token, setToken] = React.useState(() => getStudioAccessToken())
  const [snapshot, setSnapshot] = React.useState<AuthMeResponse | undefined>(() => readAuthSnapshot())
  const [bootstrapped, setBootstrapped] = React.useState(false)

  const clearPersistedAuthState = React.useCallback(() => {
    clearStudioAccessToken()
    setToken(null)
    setSnapshot(undefined)
    writeAuthSnapshot(null)
    queryClient.removeQueries({ queryKey: ['studio-auth'] })
  }, [queryClient])

  const persistAuthenticatedState = React.useCallback(
    async (accessToken: string, authPayload: AuthMeResponse) => {
      setStudioAccessToken(accessToken)
      setToken(accessToken)
      setSnapshot(authPayload)
      writeAuthSnapshot(authPayload)
      queryClient.setQueryData(['studio-auth', accessToken], authPayload)
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const loadAuthPayloadForToken = React.useCallback(
    async (accessToken: string) => {
      let lastError: unknown = null
      for (const delayMs of AUTH_ME_RETRY_DELAYS_MS) {
        if (delayMs) {
          await wait(delayMs)
        }
        try {
          const authPayload = await studioApi.getMeWithToken(accessToken)
          await persistAuthenticatedState(accessToken, authPayload)
          return authPayload
        } catch (error) {
          lastError = error
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error('Studio could not finish sign-in right now. Please try again.')
    },
    [persistAuthenticatedState],
  )

  React.useEffect(() => {
    let mounted = true

    supabaseBrowser.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        const sessionToken = data.session?.access_token ?? null
        if (sessionToken && sessionToken !== getStudioAccessToken() && !isOAuthCallbackUrl()) {
          setStudioAccessToken(sessionToken)
          setToken(sessionToken)
          logAuthTrace('bootstrap_session_synced', { hasSessionToken: true })
        }
        setBootstrapped(true)
      })
      .catch(() => {
        if (mounted) setBootstrapped(true)
      })

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      const nextToken = session?.access_token ?? null
      if (nextToken) {
        if (isOAuthCallbackUrl()) {
          logAuthTrace('oauth_auth_state_buffered', { event, hasAccessToken: true })
          return
        }
        setStudioAccessToken(nextToken)
        setToken(nextToken)
        logAuthTrace('auth_state_token_synced', { event })
      } else if (event === 'SIGNED_OUT' || (!getStudioAccessToken() && !isOAuthCallbackUrl())) {
        clearStudioAccessToken()
        setToken(null)
        setSnapshot(undefined)
        writeAuthSnapshot(null)
        logAuthTrace('auth_state_cleared', { event })
      }
    })

    const syncLocal = () => setToken(getStudioAccessToken())
    window.addEventListener('oc-studio-auth', syncLocal)

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
      window.removeEventListener('oc-studio-auth', syncLocal)
    }
  }, [])

  const authQuery = useQuery({
    queryKey: ['studio-auth', token],
    queryFn: () => studioApi.getMe(),
    enabled: bootstrapped && Boolean(token) && !isOAuthCallbackUrl(),
    placeholderData: snapshot,
  })

  const effectiveAuth = authQuery.data ?? snapshot

  React.useEffect(() => {
    if (!bootstrapped || !token || !authQuery.error) return
    if (isOAuthCallbackUrl()) {
      logAuthTrace('auth_query_error_ignored_during_oauth_callback', {
        message: authQuery.error instanceof Error ? authQuery.error.message : String(authQuery.error),
      })
      return
    }
    if (!isRecoverableSessionError(authQuery.error) && !(authQuery.error instanceof Error && /authentication required/i.test(authQuery.error.message))) {
      return
    }

    logAuthTrace('auth_query_error_clearing_state', {
      message: authQuery.error instanceof Error ? authQuery.error.message : String(authQuery.error),
    })
    clearPersistedAuthState()
  }, [authQuery.error, bootstrapped, clearPersistedAuthState, token])

  React.useEffect(() => {
    if (!authQuery.data) return
    setSnapshot(authQuery.data)
    writeAuthSnapshot(authQuery.data)
  }, [authQuery.data])

  const signInDemo = React.useCallback(
    async (plan: IdentityPlan = 'free', displayName = 'Creator') => {
      const response = await studioApi.demoLogin(plan, displayName)
      await persistAuthenticatedState(response.access_token, response.identity)
    },
    [persistAuthenticatedState],
  )

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const response = await studioApi.signIn({ email, password })
      await syncBrowserSession(response.access_token, response.refresh_token)
      await persistAuthenticatedState(response.access_token, response.identity)
    },
    [persistAuthenticatedState],
  )

  const signUp = React.useCallback(
    async (input: SignupInput) => {
      const response = await studioApi.signUp({
        display_name: input.displayName,
        username: input.username,
        email: input.email,
        password: input.password,
        accepted_terms: input.acceptedTerms,
        accepted_privacy: input.acceptedPrivacy,
        accepted_usage_policy: input.acceptedUsagePolicy,
        marketing_opt_in: input.marketingOptIn,
      })
      await syncBrowserSession(response.access_token, response.refresh_token)
      await persistAuthenticatedState(response.access_token, response.identity)
    },
    [persistAuthenticatedState],
  )

  const signInWithProvider = React.useCallback(async (provider: 'google' | 'facebook' | 'apple' | 'twitter', nextPath = '/studio') => {
    try {
      await supabaseBrowser.auth.signOut()
    } catch {
      // Best-effort cleanup only; stale local auth should not block provider sign-in.
    }
    clearPersistedAuthState()
    setStudioPostAuthRedirect(nextPath)
    const redirectTo = getOAuthRedirectUrl()
    logAuthTrace('oauth_sign_in_started', { provider, redirectTo, nextPath })
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) throw error
  }, [clearPersistedAuthState])

  const completeOAuthSignIn = React.useCallback(async () => {
    const callbackKey = getOAuthCallbackKey()
    if (oauthCompletionPromiseInFlight && oauthCompletionKeyInFlight === callbackKey) {
      return oauthCompletionPromiseInFlight
    }

    oauthCompletionKeyInFlight = callbackKey
    oauthCompletionPromiseInFlight = (async () => {
      logAuthTrace('oauth_callback_started', { callbackKey })
      const callbackError = readOAuthCallbackError()
      if (callbackError) {
        logAuthTrace('oauth_callback_provider_error', { callbackError })
        clearOAuthCallbackUrl()
        throw new Error(callbackError)
      }

      const currentUrl = typeof window === 'undefined' ? null : new URL(window.location.href)
      const authCode = currentUrl?.searchParams.get('code')
      const hashParams = new URLSearchParams(currentUrl?.hash.replace(/^#/, '') ?? '')
      const hashAccessToken = hashParams.get('access_token')
      const hashRefreshToken = hashParams.get('refresh_token')
      let session = null

      if (hashAccessToken && hashRefreshToken) {
        logAuthTrace('oauth_callback_setting_hash_session', { hasHashAccessToken: true, hasHashRefreshToken: true })
        const { data, error } = await supabaseBrowser.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        })
        if (error) {
          clearOAuthCallbackUrl()
          throw error
        }
        session = data.session
      }

      if (!session?.access_token && authCode) {
        logAuthTrace('oauth_callback_exchanging_code', { hasCode: true })
        const { data, error } = await supabaseBrowser.auth.exchangeCodeForSession(authCode)
        if (error) {
          clearOAuthCallbackUrl()
          throw error
        }
        session = data.session
      }

      if (!session?.access_token) {
        for (const delayMs of OAUTH_SESSION_RETRY_DELAYS_MS) {
          if (delayMs) {
            await wait(delayMs)
          }
          const { data, error } = await supabaseBrowser.auth.getSession()
          if (error) {
            clearOAuthCallbackUrl()
            throw error
          }
          if (data.session?.access_token) {
            session = data.session
            logAuthTrace('oauth_callback_session_detected', { delayMs })
            break
          }
        }
      }

      if (!session?.access_token) {
        logAuthTrace('oauth_callback_session_missing')
        clearOAuthCallbackUrl()
        throw new Error('Google sign-in could not be completed. Please try again.')
      }

      const { error: userError } = await supabaseBrowser.auth.getUser(session.access_token)
      if (userError) {
        logAuthTrace('oauth_callback_supabase_user_rejected', { message: userError.message })
        clearOAuthCallbackUrl()
        throw userError
      }

      let authSyncError: unknown = null
      try {
        await loadAuthPayloadForToken(session.access_token)
        logAuthTrace('oauth_callback_backend_auth_synced', { strategy: 'initial_session' })
      } catch (error) {
        authSyncError = error
      }

      if (authSyncError && isRecoverableSessionError(authSyncError)) {
        logAuthTrace('oauth_callback_backend_auth_retrying', {
          message: authSyncError instanceof Error ? authSyncError.message : String(authSyncError),
        })

        for (const delayMs of OAUTH_AUTH_SYNC_RETRY_DELAYS_MS) {
          await wait(delayMs)
          const { data, error } = await supabaseBrowser.auth.getSession()
          if (error) {
            authSyncError = error
            break
          }
          if (!data.session?.access_token) {
            continue
          }

          try {
            await loadAuthPayloadForToken(data.session.access_token)
            authSyncError = null
            logAuthTrace('oauth_callback_backend_auth_synced', { strategy: 'session_retry', delayMs })
            break
          } catch (retryError) {
            authSyncError = retryError
            if (!isRecoverableSessionError(retryError)) {
              break
            }
          }
        }

        if (authSyncError && session.refresh_token) {
          const { data, error: refreshError } = await supabaseBrowser.auth.refreshSession()
          if (!refreshError && data.session?.access_token) {
            try {
              await loadAuthPayloadForToken(data.session.access_token)
              authSyncError = null
              logAuthTrace('oauth_callback_backend_auth_synced', { strategy: 'refresh_session' })
            } catch (refreshLoadError) {
              authSyncError = refreshLoadError
            }
          } else if (refreshError) {
            logAuthTrace('oauth_callback_refresh_failed', { message: refreshError.message })
          }
        }
      }

      if (authSyncError) {
        clearOAuthCallbackUrl()
        throw authSyncError instanceof Error
          ? authSyncError
          : new Error('Google sign-in could not be completed. Please try again.')
      }
      clearOAuthCallbackUrl()
      logAuthTrace('oauth_callback_completed')
    })()

    try {
      await oauthCompletionPromiseInFlight
    } finally {
      if (oauthCompletionKeyInFlight === callbackKey) {
        oauthCompletionKeyInFlight = null
        oauthCompletionPromiseInFlight = null
      }
    }
  }, [loadAuthPayloadForToken])

  const signOut = React.useCallback(async () => {
    await supabaseBrowser.auth.signOut()
    clearPersistedAuthState()
    await queryClient.invalidateQueries()
  }, [clearPersistedAuthState, queryClient])

  const value = React.useMemo<StudioAuthContextValue>(
    () => ({
      auth: effectiveAuth,
      isLoading: !bootstrapped || authQuery.isLoading,
      isAuthSyncing: Boolean(token) && authQuery.isFetching,
      isAuthenticated: Boolean(token && effectiveAuth && !effectiveAuth.guest),
      completeOAuthSignIn,
      signIn,
      signUp,
      signInWithProvider,
      signInDemo,
      signOut,
      consumeRedirectAfterAuth: () => consumeStudioPostAuthRedirect(),
    }),
    [
      effectiveAuth,
      authQuery.isFetching,
      authQuery.isLoading,
      bootstrapped,
      completeOAuthSignIn,
      signIn,
      signUp,
      signInWithProvider,
      signInDemo,
      signOut,
      token,
    ],
  )

  return <StudioAuthContext.Provider value={value}>{children}</StudioAuthContext.Provider>
}

export function useStudioAuth() {
  const context = React.useContext(StudioAuthContext)
  if (!context) {
    throw new Error('useStudioAuth must be used within StudioAuthProvider')
  }
  return context
}
