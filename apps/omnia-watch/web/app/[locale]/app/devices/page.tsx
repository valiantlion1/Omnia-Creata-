import Link from "next/link";
import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Input, SectionHeading } from "@omnia-watch/ui";
import { formatBytes, formatRelativeTime } from "@omnia-watch/utils";
import { PairingPanel } from "@/components/app/pairing-panel";
import { StatusBadge } from "@/components/app/status-badge";
import { getDevicesForPage } from "@/lib/server/app-data";
import { getDevicePipelineMode } from "@/lib/runtime";
import { localizePath } from "@/lib/site";

export default async function DevicesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ query?: string }>;
}) {
  const { locale } = await params;
  const { query = "" } = await searchParams;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const { devices, reclaimableByDevice } = await getDevicesForPage(locale, query);
  const pairingMode = getDevicePipelineMode();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={dictionary.app.devices.addDevice}
        title={dictionary.app.devices.title}
        description={dictionary.app.devices.description}
      />

      <form className="max-w-md">
        <Input defaultValue={query} name="query" placeholder="Search devices" />
      </form>

      <PairingPanel locale={locale} mode={pairingMode} title={dictionary.app.devices.addDevice} />

      <div className="grid gap-4">
        {devices.map((device) => {
          const reclaimable = reclaimableByDevice[device.id] ?? 0;

          return (
            <Link
              key={device.id}
              href={localizePath(locale, `/app/devices/${device.id}`)}
              className="rounded-3xl border border-line/70 bg-surface/80 p-5 shadow-ambient transition hover:border-accent/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-semibold text-text">{device.name}</p>
                  <p className="mt-2 text-sm text-muted">{device.osVersion}</p>
                </div>
                <StatusBadge value={device.status} />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
                  <p className="text-sm text-muted">Last seen</p>
                  <p className="mt-2 font-semibold text-text">
                    {formatRelativeTime(device.lastSeenAt, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
                  <p className="text-sm text-muted">Issues</p>
                  <p className="mt-2 font-semibold text-text">{device.issueCount}</p>
                </div>
                <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
                  <p className="text-sm text-muted">Cleanup headroom</p>
                  <p className="mt-2 font-semibold text-text">{formatBytes(reclaimable)}</p>
                </div>
                <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
                  <p className="text-sm text-muted">Attention score</p>
                  <p className="mt-2 font-semibold text-text">{device.attentionScore}/100</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
