import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";
import { LinkButton } from "@/components/link-button";
import { localizePath } from "@/lib/site";

const pricingTiers = [
  {
    cta: "Start foundation",
    description:
      "For a single PC owner who wants clean visibility, trustworthy scans, and a serious launch path.",
    features: ["1 device", "Core scan history", "Manual recommendations", "Download center access"],
    name: "Starter",
    price: "$0"
  },
  {
    cta: "Choose Pro",
    description:
      "For enthusiasts and families who want multi-device monitoring, recommendations, and agent-driven intelligence.",
    features: ["Up to 5 devices", "Priority recommendations", "Update awareness", "Cleanup insights"],
    name: "Pro",
    price: "$12"
  },
  {
    cta: "Talk to us",
    description:
      "For future teams, repair desks, and small organizations that need account controls and device fleet growth.",
    features: ["10+ devices", "Organization-ready model", "Team billing path", "Future command architecture"],
    name: "Team",
    price: "Custom"
  }
] as const;

export default async function PricingPage({
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
        eyebrow={dictionary.common.viewPlans}
        title={dictionary.marketing.pricing.title}
        description={dictionary.marketing.pricing.subtitle}
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {pricingTiers.map((tier, index) => (
          <Card
            key={tier.name}
            className={index === 1 ? "border-accent/30 bg-accent/10" : undefined}
          >
            <p className="text-sm uppercase tracking-[0.22em] text-muted">{tier.name}</p>
            <p className="mt-4 font-display text-4xl font-semibold text-text">{tier.price}</p>
            <p className="mt-4 text-sm leading-6 text-muted">{tier.description}</p>
            <div className="mt-6 space-y-3">
              {tier.features.map((feature) => (
                <div key={feature} className="rounded-2xl border border-line/60 bg-panel/40 px-4 py-3 text-sm text-muted">
                  {feature}
                </div>
              ))}
            </div>
            <LinkButton className="mt-8 w-full" href={localizePath(locale, "/sign-up")} variant={index === 1 ? "primary" : "secondary"}>
              {tier.cta}
            </LinkButton>
          </Card>
        ))}
      </div>
    </div>
  );
}
