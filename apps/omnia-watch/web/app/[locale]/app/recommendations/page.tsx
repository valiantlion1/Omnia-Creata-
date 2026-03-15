import Link from "next/link";
import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, Input, SectionHeading } from "@omnia-watch/ui";
import { StatusBadge } from "@/components/app/status-badge";
import { getRecommendationsForPage } from "@/lib/server/app-data";
import { localizePath } from "@/lib/site";

export default async function RecommendationsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ severity?: string }>;
}) {
  const { locale } = await params;
  const { severity } = await searchParams;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const { recommendations } = await getRecommendationsForPage(locale, severity);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={dictionary.app.recommendations.title}
        title={dictionary.app.recommendations.title}
        description={dictionary.app.recommendations.description}
      />
      <form className="max-w-sm">
        <Input defaultValue={severity} name="severity" placeholder="Filter by severity" />
      </form>
      <div className="grid gap-4">
        {recommendations.map((recommendation) => (
          <Link
            key={recommendation.id}
            href={localizePath(locale, recommendation.actionPath)}
            className="block rounded-3xl border border-line/70 bg-surface/80 p-5 shadow-ambient transition hover:border-accent/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-semibold text-text">
                  {recommendation.title}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                  {recommendation.summary}
                </p>
              </div>
              <StatusBadge value={recommendation.severity} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-muted">
              <span>{recommendation.category}</span>
              <span>{recommendation.actionLabel}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
