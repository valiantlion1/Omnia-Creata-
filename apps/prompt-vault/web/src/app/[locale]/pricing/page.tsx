import { pricingTiers } from "@prompt-vault/config";
import { MarketingShell } from "@/components/site/marketing-shell";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { assertLocale, localizeHref } from "@/lib/locale";
import Link from "next/link";

export default async function PricingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-14 md:px-6 lg:py-20">
        <div className="space-y-4 text-center">
          <Badge tone="accent">Nolra beta</Badge>
          <h1 className="font-display text-5xl tracking-[-0.06em] text-[var(--text-primary)]">
            Simple pricing now, Pro later.
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            Beta starts with a free ad-supported plan. Pro arrives in V1 with no ads, bigger limits,
            and AI assist.
          </p>
          <Link href={localizeHref(safeLocale, "/app")}>
            <Button size="lg">Open the beta</Button>
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Surface key={tier.key} className="space-y-4 p-6">
              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {tier.key}
                </div>
                <div className="text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {tier.price}
                  <span className="ml-1 text-base text-[var(--text-secondary)]">{tier.cadence}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                <p>{tier.limits.prompts}</p>
                <p>{tier.limits.collections}</p>
                <p>{tier.limits.exports}</p>
              </div>
            </Surface>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}


