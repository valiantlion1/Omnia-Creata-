import { NavShell } from "@/components/nav-shell";
import { appEnv } from "@/lib/env";

export default function SettingsPage() {
  const settings = [
    ["Primary UI", "ops.omniacreata.com"],
    ["Staging UI", "staging-ops.omniacreata.com"],
    ["Ingress Host", "hooks-ops.omniacreata.com"],
    ["Cloudflare Access", appEnv.trustCloudflareAccess ? "trusted edge access enabled" : "strict token mode"],
    ["Mode", appEnv.demoMode ? "demo" : "live"],
    ["Studio production", appEnv.studioProdBaseUrl],
    ["Studio staging", appEnv.studioStagingBaseUrl]
  ];

  return (
    <NavShell eyebrow="Operator Settings">
      <section className="ocos-panel-strong">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="ocos-kicker">Runtime</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
              Environment notes
            </h2>
          </div>
          <p className="ocos-copy max-w-3xl">
            Production protection lives at the edge. CLI traffic should use PATs. Machine ingress should go through the
            signed hooks worker.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {settings.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-2 rounded-[22px] border border-[var(--ocos-border-strong)] bg-white/78 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm uppercase tracking-[0.24em] text-[var(--ocos-muted)]">{label}</div>
              <div className="font-mono text-xs text-[var(--ocos-ink)] sm:text-sm">{value}</div>
            </div>
          ))}
        </div>
      </section>
    </NavShell>
  );
}
