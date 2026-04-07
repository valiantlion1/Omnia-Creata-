import { NavShell } from "@/components/nav-shell";
import { OfflineSnapshot } from "@/components/offline-snapshot";

export default function OfflinePage() {
  return (
    <NavShell eyebrow="Offline Shell">
      <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Cached snapshot</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">OCOS is offline right now.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
          The service worker loaded the offline shell. Once connectivity returns, refresh to pull the latest incident and action state.
        </p>
        <OfflineSnapshot />
      </section>
    </NavShell>
  );
}
