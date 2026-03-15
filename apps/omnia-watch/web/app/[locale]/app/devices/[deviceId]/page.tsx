import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, ProgressBar, SectionHeading } from "@omnia-watch/ui";
import { formatBytes, formatRelativeTime } from "@omnia-watch/utils";
import { StatusBadge } from "@/components/app/status-badge";
import { getDeviceDetailForPage } from "@/lib/server/app-data";

export default async function DeviceDetailPage({
  params
}: {
  params: Promise<{ locale: string; deviceId: string }>;
}) {
  const { deviceId, locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const detail = await getDeviceDetailForPage(locale, deviceId);
  if (!detail) {
    notFound();
  }
  const { applications, cleanup, device, recommendations, scan, startup } = detail;
  const securityItems = scan?.securityItems ?? [];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={formatRelativeTime(device.lastScanAt, locale)}
        title={device.name}
        description={device.osVersion}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">{dictionary.app.deviceDetail.health}</p>
          <p className="mt-3 text-3xl font-semibold text-text">{device.attentionScore}/100</p>
          <ProgressBar className="mt-4" tone="warning" value={device.attentionScore} />
        </Card>
        <Card>
          <p className="text-sm text-muted">Storage used</p>
          <p className="mt-3 text-3xl font-semibold text-text">
            {formatBytes(device.latestHealth.storageUsedBytes)}
          </p>
          <p className="mt-2 text-sm text-muted">
            of {formatBytes(device.latestHealth.storageTotalBytes)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Memory pressure</p>
          <p className="mt-3 text-3xl font-semibold text-text">
            {device.latestHealth.memoryUsagePercent}%
          </p>
          <ProgressBar className="mt-4" tone="accent" value={device.latestHealth.memoryUsagePercent} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">
            {dictionary.app.deviceDetail.recommendations}
          </h2>
          <div className="mt-6 space-y-4">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-2xl border border-line/60 bg-panel/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{recommendation.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{recommendation.summary}</p>
                  </div>
                  <StatusBadge value={recommendation.severity} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">
            {dictionary.app.deviceDetail.security}
          </h2>
          <div className="mt-6 space-y-4">
            {securityItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line/60 bg-panel/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                  </div>
                  <StatusBadge value={item.status === "warning" ? "manual" : item.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="font-display text-xl font-semibold text-text">
            {dictionary.app.deviceDetail.cleanup}
          </h2>
          <div className="mt-5 space-y-3">
            {cleanup.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line/60 bg-panel/40 px-4 py-3">
                <p className="font-medium text-text">{item.label}</p>
                <p className="mt-2 text-sm text-muted">{formatBytes(item.estimatedBytes)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-semibold text-text">
            {dictionary.app.deviceDetail.startup}
          </h2>
          <div className="mt-5 space-y-3">
            {startup.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line/60 bg-panel/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{item.name}</p>
                    <p className="mt-2 text-sm text-muted">{item.source}</p>
                  </div>
                  <StatusBadge value={item.impact} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-semibold text-text">Applications</h2>
          <div className="mt-5 space-y-3">
            {applications.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-2xl border border-line/60 bg-panel/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{item.displayName}</p>
                    <p className="mt-2 text-sm text-muted">
                      {item.installedVersion}
                      {item.availableVersion ? ` -> ${item.availableVersion}` : ""}
                    </p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
