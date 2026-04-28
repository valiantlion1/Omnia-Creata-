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
    name: "Free Account",
    price: "$0",
    cadence: "Account access",
    description: "Explore Studio, manage your account, and buy wallet credits when checkout is available.",
    points: ["No bundled image credits", "Create-first access path", "Wallet credit packs supported"],
  },
  {
    name: "Creator",
    price: "$12",
    cadence: "per month",
    description: "A focused paid plan for regular creative image work.",
    points: ["400 monthly credits", "Studio Create access", "Commercial account support"],
  },
  {
    name: "Pro",
    price: "$24",
    cadence: "per month",
    description: "More monthly room for heavier Studio usage.",
    points: ["1,200 monthly credits", "Higher credit allowance", "Built for repeated production work"],
  },
];

const creditPacks = [
  {
    name: "Credit pack 200",
    price: "$8",
    description: "A smaller top-up for occasional extra renders.",
  },
  {
    name: "Credit pack 800",
    price: "$24",
    description: "A larger top-up for heavier bursts of image generation.",
  },
];

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
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="max-w-[860px] space-y-5">
          <p className="site-kicker">Pricing</p>
          <h1 className="site-title max-w-[12ch]">Studio pricing.</h1>
          <p className="site-copy">
            Omnia Creata Studio is a paid creative workspace for AI-assisted visual production.
            Public checkout opens through the official billing flow when access is available.
          </p>
        </div>

        <div className="site-rule mt-12 grid gap-5 pt-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              className="rounded-[28px] border border-[rgba(216,181,109,0.14)] bg-[rgba(255,255,255,0.035)] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)]"
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

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="site-kicker">Credit packs</p>
            <p className="site-copy mt-4">
              Credit packs are one-time top-ups for additional Studio image generation.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {creditPacks.map((pack) => (
              <article
                className="rounded-[24px] border border-[rgba(216,181,109,0.12)] bg-[rgba(255,255,255,0.03)] p-5"
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

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">Billing notes</p>
            <p className="site-copy mt-4">
              Prices are listed in USD. Taxes may apply. Subscriptions renew monthly until
              canceled. See the terms, privacy policy, and refund policy before purchase.
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
