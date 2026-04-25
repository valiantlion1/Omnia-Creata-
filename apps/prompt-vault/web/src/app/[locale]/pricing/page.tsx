import { pricingTiers } from "@prompt-vault/config";
import { MarketingShell } from "@/components/site/marketing-shell";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { assertLocale, localizeHref } from "@/lib/locale";
import Link from "next/link";

const copy = {
  en: {
    eyebrow: "OmniaPrompt plans",
    title: "Start free. Upgrade only when paid features are ready.",
    description:
      "The current workspace is free to use. Future paid features will be explained clearly before any charge.",
    cta: "Open app"
  },
  tr: {
    eyebrow: "OmniaPrompt planlari",
    title: "Ucretsiz basla. Ucretli ozellikler hazir olunca yukselt.",
    description:
      "Mevcut calisma alani ucretsiz kullanilir. Gelecekteki ucretli ozellikler herhangi bir ucretten once net aciklanir.",
    cta: "Uygulamayi ac"
  }
} as const;

const tierCopy = {
  en: {
    free: ["Up to 150 entries", "Up to 8 projects", "Local export included"],
    pro: ["Higher limits", "More projects and organization tools", "AI help and premium sync when available"],
    studio: ["Team workspaces", "Shared projects and approvals", "Admin controls for larger teams"]
  },
  tr: {
    free: ["150 kayda kadar", "8 projeye kadar", "Yerel disa aktarma dahil"],
    pro: ["Daha yuksek limitler", "Daha fazla proje ve duzen araci", "Kullanima acildiginda AI yardimi ve premium sync"],
    studio: ["Ekip calisma alanlari", "Paylasimli projeler ve onaylar", "Buyuk ekipler icin yonetim kontrolleri"]
  }
} as const;

export default async function PricingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const content = copy[safeLocale];

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-14 md:px-6 lg:py-20">
        <div className="space-y-4 text-center">
          <Badge tone="accent">{content.eyebrow}</Badge>
          <h1 className="font-display text-5xl tracking-[-0.06em] text-[var(--text-primary)]">
            {content.title}
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            {content.description}
          </p>
          <Link href={localizeHref(safeLocale, "/app")}>
            <Button size="lg">{content.cta}</Button>
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
                {tierCopy[safeLocale][tier.key].map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </Surface>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}


