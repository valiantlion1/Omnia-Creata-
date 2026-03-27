import { AppPage, Surface, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

export default function AccountPage() {
  const { auth } = useStudioAuth()

  return (
    <AppPage>
      <div className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">My Account</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Identity and access</h1>
        </div>

        <Surface tone="muted" className="space-y-1">
          {[
            ['Name', auth?.identity.display_name ?? 'Guest'],
            ['Email', auth?.identity.email || 'Guest'],
            ['Studio ID', auth?.identity.workspace_id || 'Not available'],
            ['Plan', auth?.plan.label ?? 'Guest'],
            ['Credits', String(auth?.credits.remaining ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-2xl px-1 py-2 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-zinc-400">{label}</div>
              <div className="break-all text-sm font-medium text-white">{value}</div>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-2xl px-1 py-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-zinc-400">Mode</div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="neutral">{auth?.guest ? 'Guest' : 'Signed in'}</StatusPill>
              {auth?.identity.local_access ? <StatusPill tone="success">Local</StatusPill> : <StatusPill tone="neutral">Cloud</StatusPill>}
            </div>
          </div>
        </Surface>
      </div>
    </AppPage>
  )
}
