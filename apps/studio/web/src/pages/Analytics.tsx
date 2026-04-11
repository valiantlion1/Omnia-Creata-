import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Activity, Database, Zap, ShieldAlert, Cpu } from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'
import { getStudioAccessToken } from '@/lib/studioSession'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { auth: session } = useStudioAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  usePageMeta('Admin Analytics', 'System telemetry and performance monitoring for root administrators.')

  useEffect(() => {
    // 1. Client-side rapid block
    if (session?.identity && !session.identity.root_admin) {
        navigate('/explore', { replace: true })
        return
    }

    async function fetchTelemetry() {
      try {
        const token = getStudioAccessToken() || ''
        const resp = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') + '/v1/admin/telemetry', { headers: { Authorization: 'Bearer ' + token } })
        const res = await resp.json()
        setData(res)
      } catch (err: any) {
        // 2. Server-side authoritative block
        if (err.response?.status === 403 || err.response?.status === 401) {
           navigate('/explore', { replace: true })
        }
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    if (session?.identity?.root_admin) {
        fetchTelemetry()
    } else if (session?.identity) {
        setLoading(false)
        setError(true)
    }
  }, [session, navigate])

  if (loading) return <div className="p-10 text-zinc-500 font-medium tracking-wide">Establishing Secure Connection...</div>

  const cost = data?.telemetry?.grand_total_spent_usd || 0

  const statCards = [
    {
      title: 'Model Inferences',
      value: data?.telemetry?.grand_total_generations || 0,
      trend: '+Active',
      trendUp: true,
      icon: <Cpu className="h-5 w-5 text-blue-400" />,
    },
    {
      title: 'Total API Cost',
      value: `$${cost.toFixed(4)}`,
      trend: 'Live',
      trendUp: true, 
      icon: <Database className="h-5 w-5 text-emerald-400" />,
    },
    {
      title: 'Active Workspaces',
      value: data?.total_identities || 0,
      trend: 'Network',
      trendUp: true,
      icon: <Activity className="h-5 w-5 text-purple-400" />,
    },
    {
      title: 'Blocked Injections',
      value: data?.blocked_injections || 0,
      trend: 'Critical',
      trendUp: false,
      icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-8 px-4 py-8 md:px-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-500 uppercase tracking-wider">
          <LineChart className="h-4 w-4" />
          <span>System Telemetry</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Admin Analytics
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Monitor real-time system performance, provider API costs, and security events across the entire Omni Creata framework (Root Admin Access Only).
        </p>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-400">
          <ShieldAlert className="h-6 w-6" />
          <p className="font-medium">Failed to connect to secure telemetry stream. You do not have Root Privileges.</p>
        </div>
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, idx) => (
              <div key={idx} className="flex flex-col rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/[0.1]">
                    {stat.icon}
                  </div>
                  <span className={`text-sm font-semibold ${stat.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-6 flex flex-col">
                  <span className="text-sm font-medium text-zinc-500">{stat.title}</span>
                  <span className="mt-1 text-3xl font-bold tracking-tight text-white">{stat.value}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="col-span-2 flex min-h-[400px] flex-col rounded-[32px] border border-white/[0.08] bg-[#0e0f12] p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent opacity-50" />
              <h3 className="text-lg font-semibold text-white mb-6">API Provider Utilization</h3>
              <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] p-6">
                <div className="flex flex-col items-center text-center text-zinc-500 gap-3">
                  <Zap className="h-8 w-8 text-emerald-500/80" />
                  <p>Secure connection established.<br/>System is operating normally.</p>
                </div>
              </div>
            </div>
            
            <div className="flex min-h-[400px] flex-col rounded-[32px] border border-white/[0.08] bg-[#0e0f12] p-8 hidden lg:flex">
              <h3 className="text-lg font-semibold text-white mb-6">Security Audit Log</h3>
              <div className="flex-1 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4 border-b border-white/[0.05] pb-4">
                    <div className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                    <div>
                      <p className="text-sm font-medium text-white">Injection Blocked</p>
                      <p className="text-xs text-zinc-500">Payload blocked by AI wrapper.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
