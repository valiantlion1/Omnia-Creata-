import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { studioApi, type IdentityPlan } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { sanitizeStudioRedirectPath } from '@/lib/studioSession'

type StudioProofBridgeState = {
  ready: boolean
  pathname: string
  search: string
  href: string
  isAuthenticated: boolean
  isGuest: boolean
  plan: IdentityPlan | null
}

type StudioProofProjectSeed = {
  projectId: string
  route: string
}

type StudioProofBridge = {
  isReady: () => boolean
  getState: () => StudioProofBridgeState
  demoLogin: (plan?: IdentityPlan, displayName?: string) => Promise<StudioProofBridgeState>
  signOut: () => Promise<StudioProofBridgeState>
  navigate: (path: string) => Promise<StudioProofBridgeState>
  ensureProjectRoute: (title?: string) => Promise<StudioProofProjectSeed>
}

declare global {
  interface Window {
    __OMNIA_STUDIO_PROOF__?: StudioProofBridge
  }
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs))
}

function proofBridgeEnabled() {
  if (typeof window === 'undefined') return false
  return import.meta.env.DEV || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
}

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 8_000,
  intervalMs = 100,
) {
  const startedAt = Date.now()
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Studio proof bridge timed out while waiting for the app state.')
    }
    await sleep(intervalMs)
  }
}

export function StudioProofBridge() {
  const enabled = proofBridgeEnabled()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    auth,
    isAuthenticated,
    isAuthSyncing,
    isLoading,
    signInDemo,
    signOut,
  } = useStudioAuth()

  const stateRef = useRef<StudioProofBridgeState>({
    ready: false,
    pathname: location.pathname,
    search: location.search,
    href: typeof window !== 'undefined' ? window.location.href : location.pathname,
    isAuthenticated: false,
    isGuest: true,
    plan: null,
  })
  const signInDemoRef = useRef(signInDemo)
  const signOutRef = useRef(signOut)
  const navigateRef = useRef(navigate)

  useEffect(() => {
    signInDemoRef.current = signInDemo
  }, [signInDemo])

  useEffect(() => {
    signOutRef.current = signOut
  }, [signOut])

  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    stateRef.current = {
      ready: !isLoading && !isAuthSyncing,
      pathname: location.pathname,
      search: location.search,
      href: typeof window !== 'undefined' ? window.location.href : `${location.pathname}${location.search}`,
      isAuthenticated: Boolean(isAuthenticated && !auth?.guest),
      isGuest: Boolean(auth?.guest ?? !isAuthenticated),
      plan: auth?.identity?.plan ?? null,
    }
  }, [auth?.guest, auth?.identity?.plan, isAuthenticated, isAuthSyncing, isLoading, location.pathname, location.search])

  const bridge = useMemo<StudioProofBridge>(() => ({
    isReady: () => stateRef.current.ready,
    getState: () => ({ ...stateRef.current }),
    demoLogin: async (plan = 'free', displayName = 'Proof Creator') => {
      if (stateRef.current.isAuthenticated) {
        await signOutRef.current()
        await waitForCondition(() => stateRef.current.ready && !stateRef.current.isAuthenticated)
      }
      await signInDemoRef.current(plan, displayName)
      await waitForCondition(
        () =>
          stateRef.current.ready &&
          stateRef.current.isAuthenticated &&
          stateRef.current.plan === plan,
      )
      return { ...stateRef.current }
    },
    signOut: async () => {
      await signOutRef.current()
      await waitForCondition(() => stateRef.current.ready && !stateRef.current.isAuthenticated)
      return { ...stateRef.current }
    },
    navigate: async (path: string) => {
      const safePath = sanitizeStudioRedirectPath(path, path.startsWith('/projects/') ? path : '/subscription')
      navigateRef.current(safePath)
      await waitForCondition(() => `${stateRef.current.pathname}${stateRef.current.search}` === safePath)
      return { ...stateRef.current }
    },
    ensureProjectRoute: async (title = 'Browser proof project') => {
      const existing = await studioApi.listProjects({ limit: 1, offset: 0, sort: 'updated' })
      const project =
        existing.projects[0] ??
        (await studioApi.createProject({
          title,
          description: '',
          surface: 'compose',
        }))
      const route = `/projects/${project.id}`
      navigateRef.current(route)
      await waitForCondition(() => stateRef.current.pathname === route)
      return {
        projectId: project.id,
        route,
      }
    },
  }), [])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined
    window.__OMNIA_STUDIO_PROOF__ = bridge
    return () => {
      if (window.__OMNIA_STUDIO_PROOF__ === bridge) {
        delete window.__OMNIA_STUDIO_PROOF__
      }
    }
  }, [bridge, enabled])

  if (!enabled) return null
  return null
}
