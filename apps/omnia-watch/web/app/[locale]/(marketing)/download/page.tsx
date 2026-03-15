import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";

export default async function DownloadPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const download = dictionary.marketing.download;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-8">
      <SectionHeading
        eyebrow={dictionary.common.downloadAgent}
        title={download.title}
        description={download.subtitle}
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">System requirements</h2>
          <div className="mt-6 space-y-3">
            {download.requirements.map((item) => (
              <div key={item} className="rounded-2xl border border-line/60 bg-panel/40 px-4 py-3 text-sm text-muted">
                {item}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">How pairing works</h2>
          <div className="mt-6 space-y-4">
            {download.steps.map((step, index) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-sm font-semibold text-accent">
                  {index + 1}
                </div>
                <p className="pt-2 text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
