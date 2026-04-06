import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
const AUTH_ME_RETRY_DELAYS_MS = [0, 150, 400]
const OAUTH_SESSION_RETRY_DELAYS_MS = [0, 150, 400, 1000]

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

export function StudioAuthProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient()
  const [token, setToken] = React.useState(() => getStudioAccessToken())
  const [snapshot, setSnapshot] = React.useState<AuthMeResponse | undefined>(() => readAuthSnapshot())
  const [bootstrapped, setBootstrapped] = React.useState(false)

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
      setStudioAccessToken(accessToken)
      setToken(accessToken)

      let lastError: unknown = null
      for (const delayMs of AUTH_ME_RETRY_DELAYS_MS) {
        if (delayMs) {
          await wait(delayMs)
        }
        try {
          const authPayload = await studioApi.getMe()
          setSnapshot(authPayload)
          writeAuthSnapshot(authPayload)
          queryClient.setQueryData(['studio-auth', accessToken], authPayload)
          await queryClient.invalidateQueries()
          return authPayload
        } catch (error) {
          lastError = error
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error('Studio could not finish sign-in right now. Please try again.')
    },
    [queryClient],
  )

  React.useEffect(() => {
    let mounted = true

    supabaseBrowser.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        const sessionToken = data.session?.access_token ?? null
        if (sessionToken && sessionToken !== getStudioAccessToken()) {
          setStudioAccessToken(sessionToken)
          setToken(sessionToken)
        }
        setBootstrapped(true)
      })
      .catch(() => {
        if (mounted) setBootstrapped(true)
      })

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      const nextToken = session?.access_token ?? null
      if (nextToken) {
        setStudioAccessToken(nextToken)
        setToken(nextToken)
      } else if (event === 'SIGNED_OUT' || !getStudioAccessToken()) {
        clearStudioAccessToken()
        setToken(null)
        setSnapshot(undefined)
        writeAuthSnapshot(null)
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
    enabled: bootstrapped && Boolean(token),
    placeholderData: snapshot,
  })

  const effectiveAuth = authQuery.data ?? snapshot

  React.useEffect(() => {
    if (!bootstrapped || !token || !authQuery.error) return
    const message = authQuery.error instanceof Error ? authQuery.error.message : ''
    if (!/invalid or expired session|authentication required|token has expired|invalid token/i.test(message)) {
      return
    }

    clearStudioAccessToken()
    setToken(null)
    setSnapshot(undefined)
    writeAuthSnapshot(null)
    queryClient.removeQueries({ queryKey: ['studio-auth'] })
  }, [authQuery.error, bootstrapped, queryClient, token])

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
    setStudioPostAuthRedirect(nextPath)
    const redirectTo = `${window.location.origin}/login?oauth=1`
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) throw error
  }, [])

  const completeOAuthSignIn = React.useCallback(async () => {
    const callbackError = readOAuthCallbackError()
    if (callbackError) {
      clearOAuthCallbackUrl()
      throw new Error(callbackError)
    }

    const currentUrl = typeof window === 'undefined' ? null : new URL(window.location.href)
    const authCode = currentUrl?.searchParams.get('code')
    let session = null

    const initialSessionResult = await supabaseBrowser.auth.getSession()
    if (initialSessionResult.error) {
      clearOAuthCallbackUrl()
      throw initialSessionResult.error
    }
    session = initialSessionResult.data.session

    if (!session?.access_token && authCode) {
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
          break
        }
      }
    }

    if (!session?.access_token) {
      clearOAuthCallbackUrl()
      throw new Error('Google sign-in could not be completed. Please try again.')
    }

    await loadAuthPayloadForToken(session.access_token)
    clearOAuthCallbackUrl()
  }, [loadAuthPayloadForToken])

  const signOut = React.useCallback(async () => {
    await supabaseBrowser.auth.signOut()
    clearStudioAccessToken()
    setToken(null)
    setSnapshot(undefined)
    writeAuthSnapshot(null)
    await queryClient.invalidateQueries()
  }, [queryClient])

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
