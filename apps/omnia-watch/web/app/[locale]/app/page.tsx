import { ArrowUpRight, BellRing, Boxes, Clock3, Cpu, HardDrive, ShieldCheck, TerminalSquare } from "lucide-react";
import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Badge, Card, ProgressBar } from "@omnia-watch/ui";
import { formatBytes, formatRelativeTime } from "@omnia-watch/utils";
import { LinkButton } from "@/components/link-button";
import { StatusBadge } from "@/components/app/status-badge";
import { getOverviewData } from "@/lib/server/app-data";
import { getDevicePipelineMode, getProductMode } from "@/lib/runtime";
import { localizePath } from "@/lib/site";

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatUptime(hours: number) {
  if (hours >= 48) {
    return `${(hours / 24).toFixed(1)}d`;
  }

  return `${Math.round(hours)}h`;
}

function percentage(count: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

const appStatusPriority = {
  current: 0,
  error: 4,
  ignored: 1,
  manual: 3,
  unsupported: 2,
  updatable: 5
} as const;

export default async function OverviewPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const overview = await getOverviewData(locale);
  const productMode = getProductMode();
  const devicePipelineMode = getDevicePipelineMode();

  const devices = overview.devices;
  const latestScan = overview.latestScan;
  const applications = latestScan.appItems;
  const recommendations = overview.recommendations;
  const activity = overview.activity.slice(0, 6);
  const updatableApps = applications.filter((item) => item.status === "updatable").length;
  const manualApps = applications.filter((item) => item.status === "manual").length;
  const errorApps = applications.filter((item) => item.status === "error").length;
  const currentApps = applications.filter((item) => item.status === "current").length;
  const reclaimableBytes = latestScan.cleanupItems.reduce(
    (total, item) => total + item.estimatedBytes,
    0
  );
  const onlineDevices = devices.filter((device) => device.status !== "offline").length;
  const averageAttention = Math.round(average(devices.map((device) => device.attentionScore)));
  const averageUptimeHours = average(
    devices.map((device) => device.latestHealth.uptimeHours)
  );
  const averageMemoryPressure = Math.round(
    average(devices.map((device) => device.latestHealth.memoryUsagePercent))
  );
  const averageStoragePressure = Math.round(
    average(devices.map((device) => device.latestHealth.diskPressurePercent))
  );
  const primaryDevice = devices[0] ?? null;
  const topAlerts = recommendations
    .filter((item) => item.severity === "critical" || item.severity === "high")
    .slice(0, 5);
  const topApps = [...applications]
    .filter((item) => item.status !== "current")
    .sort((left, right) => appStatusPriority[right.status] - appStatusPriority[left.status])
    .slice(0, 6);

  const serviceRows = [
    {
      detail:
        productMode === "connected"
          ? dictionary.app.meta.liveMode
          : dictionary.app.meta.demoMode,
      label: dictionary.app.desktop.watchApi,
      status: productMode === "connected" ? "healthy" : "attention"
    },
    {
      detail:
        devicePipelineMode === "connected"
          ? dictionary.app.status.healthy
          : dictionary.app.status.attention,
      label: dictionary.app.desktop.syncBridge,
      status: devicePipelineMode === "connected" ? "healthy" : "attention"
    },
    {
      detail:
        primaryDevice && primaryDevice.lastSeenAt
          ? formatRelativeTime(primaryDevice.lastSeenAt, locale)
          : dictionary.app.status.offline,
      label: dictionary.app.desktop.telemetry,
      status: onlineDevices > 0 ? "healthy" : "attention"
    },
    {
      detail: `${recommendations.length}`,
      label: dictionary.app.desktop.rulesEngine,
      status: recommendations.length > 0 ? "healthy" : "healthy"
    }
  ] as const;

  const heroStats = [
    {
      label: dictionary.app.desktop.onlineDevices,
      tone: onlineDevices === devices.length ? "positive" : "warning",
      value: `${onlineDevices}/${devices.length || 0}`
    },
    {
      label: dictionary.app.desktop.updateExposure,
      tone: updatableApps > 0 ? "warning" : "positive",
      value: `${percentage(updatableApps, Math.max(applications.length, 1))}%`
    },
    {
      label: dictionary.app.desktop.avgUptime,
      tone: "neutral",
      value: formatUptime(averageUptimeHours)
    },
    {
      label: dictionary.app.desktop.fleetLoad,
      tone: averageAttention >= 60 ? "critical" : averageAttention >= 30 ? "warning" : "positive",
      value: `${averageAttention}/100`
    }
  ] as const;

  const metricRows = [
    {
      icon: Cpu,
      label: dictionary.app.desktop.memoryPressure,
      tone: averageMemoryPressure >= 80 ? "danger" : averageMemoryPressure >= 60 ? "warning" : "accent",
      value: averageMemoryPressure
    },
    {
      icon: HardDrive,
      label: dictionary.app.desktop.storagePressure,
      tone: averageStoragePressure >= 80 ? "danger" : averageStoragePressure >= 60 ? "warning" : "accent",
      value: averageStoragePressure
    },
    {
      icon: ShieldCheck,
      label: dictionary.app.desktop.updateExposure,
      tone: updatableApps >= 6 ? "warning" : "success",
      value: percentage(updatableApps, Math.max(applications.length, 1))
    }
  ] as const;

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_400px]">
        <Card className="overflow-hidden rounded-[28px] border-line/40 bg-[radial-gradient(circle_at_top_left,rgba(73,214,185,0.16),transparent_30%),linear-gradient(180deg,rgba(18,26,44,0.92),rgba(10,16,29,0.9))] p-5 lg:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.22em] text-accent">
                {dictionary.app.desktop.commandCenter}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text lg:text-[2.75rem]">
                {primaryDevice?.name ?? dictionary.common.productName}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                {dictionary.app.desktop.overviewSubtitle}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <LinkButton href={localizePath(locale, "/app/devices")} size="sm" variant="primary">
                  {dictionary.app.desktop.pairCompanion}
                  <ArrowUpRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton
                  href={localizePath(locale, "/app/recommendations")}
                  size="sm"
                  variant="outline"
                >
                  {dictionary.app.desktop.reviewAlerts}
                </LinkButton>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[360px]">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-line/40 bg-canvas/55 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{item.label}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="font-display text-3xl font-semibold text-text">{item.value}</p>
                    <Badge tone={item.tone}>{item.label}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-line/40 bg-canvas/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {dictionary.app.desktop.primaryDevice}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-text">
                    {primaryDevice?.name ?? "Windows device"}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {primaryDevice?.osVersion ?? latestScan.healthSummary.osVersion}
                  </p>
                </div>
                {primaryDevice ? <StatusBadge value={primaryDevice.status} /> : null}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-line/40 bg-surface/50 px-4 py-4">
                  <p className="text-sm text-muted">{dictionary.app.desktop.latestSync}</p>
                  <p className="mt-2 font-semibold text-text">
                    {primaryDevice
                      ? formatRelativeTime(primaryDevice.lastScanAt, locale)
                      : formatRelativeTime(latestScan.createdAt, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-line/40 bg-surface/50 px-4 py-4">
                  <p className="text-sm text-muted">{dictionary.app.desktop.avgUptime}</p>
                  <p className="mt-2 font-semibold text-text">
                    {primaryDevice
                      ? formatUptime(primaryDevice.latestHealth.uptimeHours)
                      : formatUptime(latestScan.healthSummary.uptimeHours)}
                  </p>
                </div>
                <div className="rounded-2xl border border-line/40 bg-surface/50 px-4 py-4">
                  <p className="text-sm text-muted">{dictionary.app.desktop.cleanupHeadroom}</p>
                  <p className="mt-2 font-semibold text-text">{formatBytes(reclaimableBytes)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-line/40 bg-canvas/55 p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" />
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  {dictionary.app.desktop.services}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {serviceRows.map((service) => (
                  <div
                    key={service.label}
                    className="flex items-center justify-between rounded-2xl border border-line/40 bg-surface/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-text">{service.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                        {service.detail}
                      </p>
                    </div>
                    <StatusBadge value={service.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[28px] border-line/40 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,16,29,0.92))] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {dictionary.app.desktop.topAlerts}
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-text">
                {topAlerts.length || recommendations.length}
              </h3>
            </div>
            <BellRing className="h-5 w-5 text-warning" />
          </div>
          <div className="mt-5 space-y-3">
            {(topAlerts.length > 0 ? topAlerts : recommendations.slice(0, 5)).map((alert) => (
              <LinkButton
                key={alert.id}
                className="block h-auto rounded-[22px] border border-line/40 bg-canvas/55 px-4 py-4 text-left"
                href={localizePath(locale, alert.actionPath)}
                size="sm"
                variant="ghost"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text">{alert.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{alert.summary}</p>
                  </div>
                  <StatusBadge value={alert.severity} />
                </div>
              </LinkButton>
            ))}
            {recommendations.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-line/40 bg-canvas/35 px-4 py-5 text-sm text-muted">
                {dictionary.app.desktop.noAlerts}
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <Card className="rounded-[28px] border-line/40 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(11,17,30,0.9))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {dictionary.app.desktop.appBoard}
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-text">
                {applications.length} {dictionary.app.desktop.appBoard.toLowerCase()}
              </h3>
            </div>
            <LinkButton href={localizePath(locale, "/app/applications")} size="sm" variant="outline">
              <Boxes className="h-4 w-4" />
              {dictionary.app.applications.title}
            </LinkButton>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-3">
              {[
                {
                  count: updatableApps,
                  label: dictionary.app.status.updatable,
                  tone: "warning" as const
                },
                {
                  count: manualApps,
                  label: dictionary.app.status.manual,
                  tone: "accent" as const
                },
                {
                  count: errorApps,
                  label: dictionary.app.desktop.errors,
                  tone: "danger" as const
                },
                {
                  count: currentApps,
                  label: dictionary.app.desktop.current,
                  tone: "success" as const
                }
              ].map((bucket) => (
                <div
                  key={bucket.label}
                  className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">{bucket.label}</p>
                    <p className="font-semibold text-text">{bucket.count}</p>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      tone={bucket.tone}
                      value={percentage(bucket.count, Math.max(applications.length, 1))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {topApps.map((application) => (
                <div
                  key={application.id}
                  className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">{application.displayName}</p>
                      <p className="mt-1 truncate text-sm text-muted">
                        {application.publisher ?? application.sourceKind}
                      </p>
                    </div>
                    <StatusBadge value={application.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                    <span>{application.installedVersion}</span>
                    {application.availableVersion ? <span>{application.availableVersion}</span> : null}
                    <span>{application.sourceKind}</span>
                  </div>
                </div>
              ))}
              {topApps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/40 bg-canvas/35 px-4 py-5 text-sm text-muted">
                  {dictionary.app.applications.empty}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="rounded-[28px] border-line/40 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(11,17,30,0.9))] p-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-info" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {dictionary.app.desktop.metrics}
              </p>
            </div>
            <div className="mt-5 space-y-4">
              {metricRows.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div key={metric.label} className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface/70 text-info">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-text">{metric.label}</p>
                      </div>
                      <p className="font-display text-2xl font-semibold text-text">
                        {metric.value}%
                      </p>
                    </div>
                    <div className="mt-3">
                      <ProgressBar tone={metric.tone} value={metric.value} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-[28px] border-line/40 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(11,17,30,0.9))] p-5">
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-accent" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {dictionary.app.desktop.admin}
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <LinkButton href={localizePath(locale, "/app/devices")} size="sm" variant="primary">
                {dictionary.app.desktop.pairCompanion}
              </LinkButton>
              <LinkButton
                href={localizePath(locale, "/app/recommendations")}
                size="sm"
                variant="outline"
              >
                {dictionary.app.desktop.reviewAlerts}
              </LinkButton>
              <LinkButton
                href={localizePath(locale, "/app/history")}
                size="sm"
                variant="secondary"
              >
                {dictionary.app.history.title}
              </LinkButton>
              <LinkButton
                href={localizePath(locale, "/app/settings")}
                size="sm"
                variant="secondary"
              >
                {dictionary.app.settings.title}
              </LinkButton>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4">
                <p className="text-sm text-muted">{dictionary.app.desktop.plan}</p>
                <p className="mt-2 font-semibold text-text">{overview.plan.name}</p>
              </div>
              <div className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4">
                <p className="text-sm text-muted">{dictionary.app.desktop.queue}</p>
                <p className="mt-2 font-semibold text-text">{dictionary.app.status.manual}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="rounded-[28px] border-line/40 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(11,17,30,0.9))] p-5">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-warning" />
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              {dictionary.app.desktop.logs}
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {activity.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{event.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{event.summary}</p>
                  </div>
                  <StatusBadge
                    value={
                      event.status === "failed"
                        ? "critical"
                        : event.status === "running"
                          ? "attention"
                          : "healthy"
                    }
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                  <span>{event.type}</span>
                  <span>{formatRelativeTime(event.createdAt, locale)}</span>
                </div>
              </div>
            ))}
            {activity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/40 bg-canvas/35 px-4 py-5 text-sm text-muted">
                {dictionary.app.desktop.noLogs}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[28px] border-line/40 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(11,17,30,0.9))] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              {dictionary.app.desktop.latestSync}
            </p>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4">
              <p className="text-sm text-muted">{dictionary.app.desktop.latestSync}</p>
              <p className="mt-2 font-semibold text-text">
                {formatRelativeTime(latestScan.createdAt, locale)}
              </p>
            </div>
            <div className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4">
              <p className="text-sm text-muted">{dictionary.app.desktop.avgUptime}</p>
              <p className="mt-2 font-semibold text-text">{formatUptime(averageUptimeHours)}</p>
            </div>
            <div className="rounded-2xl border border-line/40 bg-canvas/50 px-4 py-4">
              <p className="text-sm text-muted">{dictionary.app.desktop.cleanupHeadroom}</p>
              <p className="mt-2 font-semibold text-text">{formatBytes(reclaimableBytes)}</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
