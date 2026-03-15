import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, Input, SectionHeading } from "@omnia-watch/ui";
import { StatusBadge } from "@/components/app/status-badge";
import { getApplicationsForPage } from "@/lib/server/app-data";

export default async function ApplicationsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ device?: string; query?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { device, query = "", status } = await searchParams;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const { devices, items } = await getApplicationsForPage(locale, { device, query, status });
  const deviceMap = new Map(devices.map((item) => [item.id, item.name]));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={dictionary.app.applications.title}
        title={dictionary.app.applications.title}
        description={dictionary.app.applications.description}
      />
      <form className="grid gap-4 md:grid-cols-2">
        <Input defaultValue={query} name="query" placeholder="Search applications" />
        <Input defaultValue={status} name="status" placeholder="Filter by status" />
      </form>
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.9fr] gap-4 border-b border-line/60 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          <div>Name</div>
          <div>Device</div>
          <div>Version</div>
          <div>Source</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-line/60">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.9fr] gap-4 px-6 py-4 text-sm"
            >
              <div>
                <p className="font-semibold text-text">{item.displayName}</p>
                <p className="mt-1 text-muted">{item.publisher ?? "Unknown publisher"}</p>
              </div>
              <div className="text-muted">{deviceMap.get(item.deviceId) ?? item.deviceId}</div>
              <div className="text-muted">
                {item.installedVersion}
                {item.availableVersion ? ` -> ${item.availableVersion}` : ""}
              </div>
              <div className="text-muted">{item.sourceKind}</div>
              <div>
                <StatusBadge value={item.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
