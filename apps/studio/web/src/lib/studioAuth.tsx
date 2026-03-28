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
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignupInput) => Promise<void>
  signInWithGoogle: (nextPath?: string) => Promise<void>
  signInDemo: (plan?: IdentityPlan, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
  consumeRedirectAfterAuth: () => string | null
}

const StudioAuthContext = React.createContext<StudioAuthContextValue | null>(null)
const AUTH_SNAPSHOT_KEY = 'oc-studio-auth-snapshot'

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

export function StudioAuthProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient()
  const [token, setToken] = React.useState(() => getStudioAccessToken())
  const [snapshot, setSnapshot] = React.useState<AuthMeResponse | undefined>(() => readAuthSnapshot())
  const [bootstrapped, setBootstrapped] = React.useState(false)

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

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      const nextToken = session?.access_token ?? null
      if (nextToken) {
        setStudioAccessToken(nextToken)
        setToken(nextToken)
      } else {
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

  React.useEffect(() => {
    if (!authQuery.data) return
    setSnapshot(authQuery.data)
    writeAuthSnapshot(authQuery.data)
  }, [authQuery.data])

  const signInDemo = React.useCallback(
    async (plan: IdentityPlan = 'free', displayName = 'Creator') => {
      const response = await studioApi.demoLogin(plan, displayName)
      setStudioAccessToken(response.access_token)
      setToken(response.access_token)
      setSnapshot(response.identity)
      writeAuthSnapshot(response.identity)
      queryClient.setQueryData(['studio-auth', response.access_token], response.identity)
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const response = await studioApi.signIn({ email, password })
      await syncBrowserSession(response.access_token, response.refresh_token)
      setStudioAccessToken(response.access_token)
      setToken(response.access_token)
      setSnapshot(response.identity)
      writeAuthSnapshot(response.identity)
      queryClient.setQueryData(['studio-auth', response.access_token], response.identity)
      await queryClient.invalidateQueries()
    },
    [queryClient],
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
      setStudioAccessToken(response.access_token)
      setToken(response.access_token)
      setSnapshot(response.identity)
      writeAuthSnapshot(response.identity)
      queryClient.setQueryData(['studio-auth', response.access_token], response.identity)
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const signInWithGoogle = React.useCallback(async (nextPath = '/studio') => {
    setStudioPostAuthRedirect(nextPath)
    const redirectTo = `${window.location.origin}/login?oauth=1`
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }, [])

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
      auth: authQuery.data,
      isLoading: !bootstrapped || authQuery.isLoading,
      isAuthSyncing: Boolean(token) && authQuery.isFetching,
      isAuthenticated: Boolean(token && !authQuery.data?.guest),
      signIn,
      signUp,
      signInWithGoogle,
      signInDemo,
      signOut,
      consumeRedirectAfterAuth: () => consumeStudioPostAuthRedirect(),
    }),
    [
      authQuery.data,
      authQuery.isFetching,
      authQuery.isLoading,
      bootstrapped,
      signIn,
      signUp,
      signInWithGoogle,
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
