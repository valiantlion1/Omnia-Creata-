import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PageHero } from "@/components/marketing/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const principles = [
  {
    title: "Focused product family",
    description: "Omnia Creata is built around a small set of flagship products with clear roles.",
  },
  {
    title: "Premium public access",
    description: "The main site should help people find the right product without friction or noise.",
  },
  {
    title: "Design with discipline",
    description: "Luxury restraint, software clarity, and direct product routes define the brand.",
  },
];

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/about",
    title: "About",
    description:
      "About Omnia Creata, a focused software company built around connected flagship products.",
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <PageHero
        actions={[
          {
            href: withLocalePrefix(locale, "/products"),
            label: "View products",
          },
          {
            href: withLocalePrefix(locale, "/contact"),
            label: "Contact",
            variant: "secondary",
          },
        ]}
        description="Omnia Creata is a focused software company building a connected ecosystem of premium flagship products."
        eyebrow="About"
        meta={[
          { label: "Company posture", value: "Premium software ecosystem" },
          { label: "Primary domain", value: "omniacreata.com" },
          { label: "Public role", value: "Product headquarters" },
        ]}
        title="A focused software company with a connected product ecosystem."
        locale={locale}
      />

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              align="center"
              description="The public brand is intentionally simple: clear products, visible access, and a polished software presence."
              eyebrow="Principles"
              title="How Omnia Creata presents itself"
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {principles.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <FeatureCard
                  description={item.description}
                  index={`0${index + 1}`}
                  title={item.title}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-12 pt-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="luxury-panel gold-outline rounded-[32px] p-7 sm:p-9">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                    Brand direction
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                    Built to feel premium, direct, and ready for long-term growth.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                    The public website should always make Omnia Creata feel like a serious product company, not a collection of experiments.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <ButtonLink
                    href={withLocalePrefix(locale, "/products")}
                    size="lg"
                    variant="primary"
                  >
                    View products
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, "/pricing")}
                    size="lg"
                    variant="secondary"
                  >
                    View pricing
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
