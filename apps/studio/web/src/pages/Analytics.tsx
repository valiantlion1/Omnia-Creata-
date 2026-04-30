import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Activity, Database, Zap, ShieldAlert, Cpu } from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type AdminTelemetryPayload } from '@/lib/studioApi'
import { toUserFacingErrorMessage } from '@/lib/uiError'
import { usePageMeta } from '@/lib/usePageMeta'

function formatCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '0'
}

function formatUsd(value: number | null | undefined) {
  return `$${(typeof value === 'number' && Number.isFinite(value) ? value : 0).toFixed(4)}`
}

function getBlockedInjectionSignal(data: AdminTelemetryPayload | undefined) {
  if (data?.blocked_injections_status === 'available' && typeof data.blocked_injections === 'number') {
    return {
      value: data.blocked_injections.toLocaleString(),
      trend: 'Tracked',
      tone: 'text-rose-400',
      detail: null,
    }
  }

  return {
    value: 'Not tracked',
    trend: 'Unavailable',
    tone: 'text-amber-300',
    detail: 'Some safety signals are not available yet.',
  }
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { auth: session, isAuthenticated, isLoading } = useStudioAuth()
  const isRootAdmin = Boolean(session?.identity.root_admin)
  usePageMeta('Admin Analytics', 'System telemetry and performance monitoring for root administrators.')

  const telemetryQuery = useQuery({
    queryKey: ['admin-telemetry'],
    queryFn: () => studioApi.getAdminTelemetry(),
    enabled: isRootAdmin,
    retry: false,
  })

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated && session?.identity && !isRootAdmin) {
      navigate('/explore', { replace: true })
    }
  }, [isAuthenticated, isLoading, isRootAdmin, navigate, session?.identity])

  useEffect(() => {
    if (!telemetryQuery.error) return
    const message = telemetryQuery.error instanceof Error ? telemetryQuery.error.message : String(telemetryQuery.error)
    if (/authentication required|invalid or expired session|root administrator required/i.test(message)) {
      navigate('/explore', { replace: true })
    }
  }, [navigate, telemetryQuery.error])

  if (isLoading) {
    return <div className="p-10 text-sm font-medium tracking-wide text-zinc-500">Loading owner telemetry...</div>
  }

  if (!isAuthenticated || !session?.identity) {
    return <Navigate to="/login?next=%2Fdashboard" replace />
  }

  if (!isRootAdmin) {
    return <div className="p-10 text-sm font-medium tracking-wide text-zinc-500">Redirecting to Explore...</div>
  }

  if (telemetryQuery.isLoading) {
    return <div className="p-10 text-sm font-medium tracking-wide text-zinc-500">Loading owner telemetry...</div>
  }

  const data = telemetryQuery.data
  const telemetry = data?.telemetry
  const blockedSignal = getBlockedInjectionSignal(data)
  const errorMessage = telemetryQuery.error
    ? toUserFacingErrorMessage(telemetryQuery.error, 'Owner telemetry could not be loaded right now.')
    : null

  const statCards = [
    {
      title: 'Model inferences',
      value: formatCount(telemetry?.grand_total_generations ?? telemetry?.event_count),
      trend: 'Live data',
      trendClassName: 'text-emerald-300',
      icon: <Cpu className="h-5 w-5 text-cyan-300" />,
      detail: null,
    },
    {
      title: 'Total API cost',
      value: formatUsd(telemetry?.grand_total_spent_usd),
      trend: 'Cost telemetry',
      trendClassName: 'text-emerald-300',
      icon: <Database className="h-5 w-5 text-emerald-300" />,
      detail: null,
    },
    {
      title: 'Active accounts',
      value: formatCount(data?.total_identities),
      trend: 'Store count',
      trendClassName: 'text-zinc-300',
      icon: <Activity className="h-5 w-5 text-sky-300" />,
      detail: null,
    },
    {
      title: 'Injection blocks',
      value: blockedSignal.value,
      trend: blockedSignal.trend,
      trendClassName: blockedSignal.tone,
      icon: <ShieldAlert className="h-5 w-5 text-amber-300" />,
      detail: blockedSignal.detail,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-7 px-4 py-7 md:px-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
          <LineChart className="h-4 w-4" />
          <span>Owner telemetry</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white">
          Admin Analytics
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-400">
          Usage, cost, and safety signals for the owner account.
        </p>
      </section>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Telemetry unavailable</p>
            <p className="mt-1 text-sm leading-6 text-rose-100/80">{errorMessage}</p>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.title} className="flex min-h-[168px] flex-col rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/[0.1]">
                    {stat.icon}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${stat.trendClassName}`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-6 flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-500">{stat.title}</span>
                  <span className="text-3xl font-semibold tracking-[-0.04em] text-white">{stat.value}</span>
                  {stat.detail ? (
                    <span className="pt-1 text-xs leading-5 text-zinc-500">{stat.detail}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
            <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0e0f12] p-7">
              <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
              <h2 className="text-lg font-semibold text-white">Provider utilization</h2>
              <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-6 text-center">
                <Zap className="h-8 w-8 text-emerald-300/80" />
                <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
                  Cost and usage totals are connected. Detailed trend charts will appear when enough history is available.
                </p>
              </div>
            </div>

            <div className="flex min-h-[360px] flex-col rounded-[28px] border border-white/[0.08] bg-[#0e0f12] p-7">
              <h2 className="text-lg font-semibold text-white">Signal health</h2>
              <div className="mt-5 flex-1 space-y-4">
                <div className="flex items-start gap-4 border-b border-white/[0.06] pb-4">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-300" />
                  <div>
                    <p className="text-sm font-medium text-white">Admin route connected</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Owner analytics are connected.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border-b border-white/[0.06] pb-4">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-amber-300" />
                  <div>
                    <p className="text-sm font-medium text-white">Unavailable fields stay explicit</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Missing signals are shown as unavailable.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
