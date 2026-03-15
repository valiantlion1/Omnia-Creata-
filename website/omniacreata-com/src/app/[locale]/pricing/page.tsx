import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingCard } from "@/components/marketing/pricing-card";
import { PageHero } from "@/components/marketing/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type PricingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const tiers = [
  {
    name: "Starter",
    price: "Custom",
    cadence: "",
    description: "For teams opening their first Omnia Creata product.",
    features: ["Product setup", "Access guidance", "Email support"],
  },
  {
    name: "Growth",
    price: "Custom",
    cadence: "",
    description: "For teams using multiple Omnia Creata products together.",
    features: ["Multi-product support", "Platform guidance", "Faster response"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "For larger organizations with advanced support and planning needs.",
    features: ["Dedicated support", "Security guidance", "Strategic planning"],
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
    description: "Pricing options for Omnia Creata products and support levels.",
  });
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <PageHero
        actions={[
          {
            href: withLocalePrefix(locale, "/contact"),
            label: "Contact",
          },
          {
            href: withLocalePrefix(locale, "/products"),
            label: "View products",
            variant: "secondary",
          },
        ]}
        description="Pricing is tailored to team size, product mix, and the level of support you need."
        eyebrow="Pricing"
        meta={[
          { label: "Model", value: "Custom pricing" },
          { label: "Focus", value: "Products and support" },
          { label: "Contact", value: "hello@omniacreata.com" },
        ]}
        title="Simple commercial paths for the Omnia Creata ecosystem."
        locale={locale}
      />

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              align="center"
              description="Choose the support level that fits your team, then contact us for product-specific pricing."
              eyebrow="Pricing structure"
              title="Three ways to get started"
            />
          </Reveal>
          <div className="mt-10 grid gap-5 xl:grid-cols-3">
            {tiers.map((tier, index) => (
              <Reveal key={tier.name} delay={index * 70}>
                <PricingCard
                  cadence={tier.cadence}
                  ctaHref={withLocalePrefix(locale, "/contact")}
                  ctaLabel="Contact"
                  description={tier.description}
                  featured={tier.name === "Growth"}
                  features={tier.features}
                  name={tier.name}
                  price={tier.price}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
