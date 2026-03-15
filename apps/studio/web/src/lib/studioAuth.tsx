import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { studioApi, type AuthMeResponse, type IdentityPlan } from '@/lib/studioApi'
import { clearStudioAccessToken, getStudioAccessToken, setStudioAccessToken } from '@/lib/studioSession'

type StudioAuthContextValue = {
  auth: AuthMeResponse | undefined
  isLoading: boolean
  isAuthenticated: boolean
  signInDemo: (plan?: IdentityPlan, displayName?: string) => Promise<void>
  signOut: () => void
}

const StudioAuthContext = React.createContext<StudioAuthContextValue | null>(null)

export function StudioAuthProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient()
  const [token, setToken] = React.useState(() => getStudioAccessToken())

  React.useEffect(() => {
    const sync = () => setToken(getStudioAccessToken())
    window.addEventListener('oc-studio-auth', sync)
    return () => window.removeEventListener('oc-studio-auth', sync)
  }, [])

  const authQuery = useQuery({
    queryKey: ['studio-auth', token],
    queryFn: () => studioApi.getMe(),
  })

  const signInDemo = React.useCallback(
    async (plan: IdentityPlan = 'free', displayName = 'Creator') => {
      const response = await studioApi.demoLogin(plan, displayName)
      setStudioAccessToken(response.access_token)
      setToken(response.access_token)
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const signOut = React.useCallback(() => {
    clearStudioAccessToken()
    setToken(null)
    queryClient.invalidateQueries()
  }, [queryClient])

  const value = React.useMemo<StudioAuthContextValue>(
    () => ({
      auth: authQuery.data,
      isLoading: authQuery.isLoading,
      isAuthenticated: Boolean(token && !authQuery.data?.guest),
      signInDemo,
      signOut,
    }),
    [authQuery.data, authQuery.isLoading, signInDemo, signOut, token],
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
