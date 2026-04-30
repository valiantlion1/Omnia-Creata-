import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { studioAccessHref, studioAccessLabel, withLocalePrefix } from "@/lib/utils";

type PricingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "Account access",
    description: "Explore Studio and add credits when you are ready to generate.",
    points: [
      "No bundled image credits",
      "Studio account access",
      "Credit packs available separately",
    ],
  },
  {
    name: "Essential",
    price: "$12",
    cadence: "per month",
    description: "A focused paid plan for regular image generation and editing.",
    points: ["4,000 monthly credits", "Studio Create and Edit access", "Standard account support"],
  },
  {
    name: "Premium",
    price: "$24",
    cadence: "per month",
    description: "More monthly room for heavier creative production.",
    points: ["12,000 monthly credits", "Higher monthly allowance", "Built for repeated production work"],
  },
];

const creditPacks = [
  {
    name: "Credit pack 2,000",
    price: "$8",
    description: "A smaller top-up for occasional extra renders.",
  },
  {
    name: "Credit pack 8,000",
    price: "$24",
    description: "A larger top-up for heavier bursts of image generation.",
  },
];

const creditExamples = [
  {
    title: "Model choice changes cost",
    description:
      "Premium model families and heavier settings can use more credits than fast drafts.",
  },
  {
    title: "Credits are flexible",
    description:
      "Use the same balance across generation, editing, and supported Studio image tasks.",
  },
  {
    title: "Examples are approximate",
    description:
      "Actual credit use depends on the selected model, resolution, quality, and workflow.",
  },
];

const modelFamilies = ["FLUX.2 Pro", "FLUX.2 Dev", "FLUX.2 Schnell", "Runware Fast", "Runware Standard", "Runware Premium"];

export async function generateMetadata({
  params,
}: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/pricing",
    title: "Pricing",
    description: "Pricing and access information for Studio.",
  });
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <section className="site-page">
      <div className="site-page-inner">
        <div className="site-page-hero site-page-hero--compact lg:grid-cols-[0.9fr_1.1fr]">
          <div className="site-page-copy">
            <p className="site-kicker">Pricing</p>
            <h1 className="site-page-title">
              Studio <strong>pricing.</strong>
            </h1>
            <p className="site-page-lede">
              Monthly credits for Studio image work, with simple top-ups when a project needs more
              room.
            </p>
          </div>

          <div className="site-premium-card p-6 sm:p-8">
            <p className="site-kicker">Plans</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {plans.map((plan) => (
                <div className="border-t border-white/[0.08] pt-4" key={`summary-${plan.name}`}>
                  <strong className="text-lg text-foreground">{plan.name}</strong>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {plan.price}
                  </p>
                  <p className="mt-2 text-sm text-muted">{plan.cadence}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="site-band lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              className="site-premium-card p-6"
              key={plan.name}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
                {plan.name}
              </p>
              <div className="mt-5 flex items-end gap-2">
                <strong className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
                  {plan.price}
                </strong>
                <span className="pb-1 text-sm text-muted">{plan.cadence}</span>
              </div>
              <p className="mt-5 text-sm leading-7 text-foreground-soft">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground-soft">
                {plan.points.map((point) => (
                  <li className="border-t border-white/[0.08] pt-3" key={point}>
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4">
            <p className="site-kicker">How credits work</p>
            <h2 className="site-title max-w-[10ch]">Credits buy model time.</h2>
            <p className="site-copy">
              Treat credits like a flexible Studio balance. Different model families and settings
              can consume different amounts.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {creditExamples.map((item) => (
              <article className="site-premium-card p-5" key={item.title}>
                <strong className="text-lg text-foreground">{item.title}</strong>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4">
            <p className="site-kicker">Model families</p>
            <h2 className="site-title max-w-[11ch]">The catalog follows current models.</h2>
            <p className="site-copy">
              Studio routes image work through the FLUX.2 family on Runware, surfaced as Fast,
              Standard, and Premium lanes. Exact variants and credit costs stay adjustable.
            </p>
          </div>

          <div className="flex flex-wrap content-start gap-3">
            {modelFamilies.map((family) => (
              <span className="site-status-pill" data-status="preview" key={family}>
                {family}
              </span>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="site-kicker">Credit packs</p>
            <p className="site-copy mt-4">
              Credit packs are one-time top-ups for extra Studio image work.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {creditPacks.map((pack) => (
              <article
                className="site-premium-card p-5"
                key={pack.name}
              >
                <strong className="text-lg text-foreground">{pack.name}</strong>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {pack.price}
                </p>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">{pack.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">Billing notes</p>
            <p className="site-copy mt-4">
              Prices are listed in USD. Taxes may apply. Subscriptions renew monthly until canceled.
              Credit use can vary by model, resolution, quality, and supported Studio task.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
              See Studio
            </ButtonLink>
            <ButtonLink href={studioAccessHref(locale)} size="lg" variant="primary">
              {studioAccessLabel()}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
