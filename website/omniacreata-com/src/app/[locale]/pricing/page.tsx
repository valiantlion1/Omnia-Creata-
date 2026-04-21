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

const pricingNotes = [
  {
    title: "Start",
    description: "Use the workspace first. The product should do the talking.",
  },
  {
    title: "Teams",
    description: "If you need a bigger plan or a commercial path, ask us directly.",
  },
  {
    title: "Timing",
    description: "Pricing gets sharper as Studio opens up.",
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
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[860px] space-y-5">
          <p className="site-kicker">Pricing</p>
          <h1 className="site-title max-w-[11ch]">Pricing follows access.</h1>
          <p className="site-copy">
            Studio is still opening up. If you need commercial details, team timing, or rollout
            clarity, talk to us directly.
          </p>
        </div>

        <div className="site-rule mt-12 grid gap-8 pt-8 lg:grid-cols-3">
          {pricingNotes.map((item) => (
            <article className="site-line-item lg:border-t-0 lg:pt-0" key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </article>
          ))}
        </div>

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">Next step</p>
            <p className="site-copy mt-4">
              Start with Studio, or contact us if you need the commercial conversation first.
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
