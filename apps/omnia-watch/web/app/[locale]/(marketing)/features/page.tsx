import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";

export default async function FeaturesPage({
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
        title={dictionary.marketing.features.title}
        description={dictionary.marketing.features.subtitle}
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {dictionary.marketing.features.pillars.map((pillar) => (
          <Card key={pillar.title} className="space-y-5">
            <h2 className="font-display text-2xl font-semibold text-text">{pillar.title}</h2>
            <p className="text-sm leading-6 text-muted">{pillar.description}</p>
            <div className="space-y-3">
              {pillar.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-line/60 bg-panel/50 px-4 py-3 text-sm text-muted">
                  {bullet}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
