import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";

export default async function SecurityPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-8">
      <SectionHeading
        eyebrow={dictionary.common.productName}
        title={dictionary.marketing.security.title}
        description={dictionary.marketing.security.subtitle}
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {dictionary.marketing.security.principles.map((principle) => (
          <Card key={principle}>
            <p className="text-base leading-7 text-text">{principle}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-text">Trust boundaries</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line/60 bg-panel/50 p-4 text-sm leading-6 text-muted">
            Web SaaS handles accounts, dashboards, history, and recommendations.
          </div>
          <div className="rounded-2xl border border-line/60 bg-panel/50 p-4 text-sm leading-6 text-muted">
            The Windows companion inspects the local device and executes only supported operations.
          </div>
          <div className="rounded-2xl border border-line/60 bg-panel/50 p-4 text-sm leading-6 text-muted">
            Device sync is validated with typed contracts so unsupported fields and spoofed payloads do not become blind trust.
          </div>
        </div>
      </Card>
    </div>
  );
}
