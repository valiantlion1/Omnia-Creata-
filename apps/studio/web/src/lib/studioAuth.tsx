import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { studioApi, type AuthMeResponse, type IdentityPlan } from '@/lib/studioApi'
import { clearStudioAccessToken, getStudioAccessToken, setStudioAccessToken } from '@/lib/studioSession'

type StudioAuthContextValue = {
  auth: AuthMeResponse | undefined
  isLoading: boolean
  isAuthSyncing: boolean
  isAuthenticated: boolean
  signInDemo: (plan?: IdentityPlan, displayName?: string) => Promise<void>
  signInLocalOwner: (ownerKey?: string, displayName?: string) => Promise<void>
  signOut: () => void
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

export function StudioAuthProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient()
  const [token, setToken] = React.useState(() => getStudioAccessToken())
  const [snapshot, setSnapshot] = React.useState<AuthMeResponse | undefined>(() => readAuthSnapshot())

  React.useEffect(() => {
    const sync = () => setToken(getStudioAccessToken())
    window.addEventListener('oc-studio-auth', sync)
    return () => window.removeEventListener('oc-studio-auth', sync)
  }, [])

  const authQuery = useQuery({
    queryKey: ['studio-auth', token],
    queryFn: () => studioApi.getMe(),
    enabled: Boolean(token),
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

  const signInLocalOwner = React.useCallback(
    async (ownerKey = '', displayName = 'Omnia Owner') => {
      const response = await studioApi.localOwnerLogin(ownerKey, displayName)
      setStudioAccessToken(response.access_token)
      setToken(response.access_token)
      setSnapshot(response.identity)
      writeAuthSnapshot(response.identity)
      queryClient.setQueryData(['studio-auth', response.access_token], response.identity)
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const signOut = React.useCallback(() => {
    clearStudioAccessToken()
    setToken(null)
    setSnapshot(undefined)
    writeAuthSnapshot(null)
    queryClient.invalidateQueries()
  }, [queryClient])

  const value = React.useMemo<StudioAuthContextValue>(
    () => ({
      auth: authQuery.data,
      isLoading: authQuery.isLoading,
      isAuthSyncing: Boolean(token) && authQuery.isFetching,
      isAuthenticated: Boolean(token && !authQuery.data?.guest),
      signInDemo,
      signInLocalOwner,
      signOut,
    }),
    [authQuery.data, authQuery.isFetching, authQuery.isLoading, signInDemo, signInLocalOwner, signOut, token],
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
