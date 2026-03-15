import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";
import { formatDateTime } from "@omnia-watch/utils";
import { StatusBadge } from "@/components/app/status-badge";
import { getDevicesForPage, getHistoryForPage } from "@/lib/server/app-data";

export default async function HistoryPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const [{ activity }, { devices }] = await Promise.all([
    getHistoryForPage(locale),
    getDevicesForPage(locale)
  ]);
  const deviceMap = new Map(devices.map((item) => [item.id, item.name]));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={dictionary.app.history.title}
        title={dictionary.app.history.title}
        description={dictionary.app.history.description}
      />
      <div className="space-y-4">
        {activity.map((event) => (
          <Card key={event.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-semibold text-text">{event.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{event.summary}</p>
              </div>
              <StatusBadge value={event.status === "failed" ? "critical" : "healthy"} />
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted">
              <span>{deviceMap.get(event.deviceId) ?? event.deviceId}</span>
              <span>{event.type}</span>
              <span>{formatDateTime(event.createdAt, locale)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
