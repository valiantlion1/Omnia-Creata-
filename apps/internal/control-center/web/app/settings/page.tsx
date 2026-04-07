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
      <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Runtime</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Environment notes</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
            Production protection lives at the edge. CLI traffic should use PATs. Machine ingress should go through the signed hooks worker.
          </p>
        </div>
        <div className="mt-6 grid gap-3">
          {settings.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm uppercase tracking-[0.24em] text-white/42">{label}</div>
              <div className="text-sm text-white/78">{value}</div>
            </div>
          ))}
        </div>
      </section>
    </NavShell>
  );
}
