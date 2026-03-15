import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/marketing/page-hero";
import { PlatformAccessBand } from "@/components/marketing/platform-access-band";
import { ProductCard } from "@/components/marketing/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/products",
    title: "Products",
    description:
      "Browse the five flagship Omnia Creata products with direct public hubs and visible platform access.",
  });
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const products = getProducts(locale);
  const studio = products[0];

  return (
    <>
      <PageHero
        actions={[
          {
            href: withLocalePrefix(locale, `/products/${studio.slug}`),
            label: messages.common.openStudio,
          },
          {
            href: withLocalePrefix(locale, "/contact"),
            label: messages.common.contactTeam,
            variant: "secondary",
          },
        ]}
        description="Each Omnia Creata product has a public hub, visible platform access, and a direct route from the main site."
        eyebrow={messages.nav.products}
        meta={[
          { label: "Flagship products", value: "5" },
          { label: "Access model", value: "Direct product hubs" },
          { label: "Domain", value: "omniacreata.com" },
        ]}
        title="Choose the product you want to open."
        locale={locale}
      />

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              align="center"
              description="Every product keeps a clear purpose, a short explanation, and a direct route."
              eyebrow={messages.home.ecosystemEyebrow}
              title={messages.home.ecosystemTitle}
            />
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {products.map((product, index) => (
              <Reveal key={product.slug} delay={index * 70}>
                <ProductCard
                  featured={product.slug === studio.slug}
                  locale={locale}
                  messages={messages}
                  product={product}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              align="center"
              description="Platform coverage is visible before users commit to a product."
              eyebrow={messages.home.platformBandEyebrow}
              title={messages.home.platformBandTitle}
            />
          </Reveal>
          <div className="mt-10">
            <Reveal delay={80}>
              <PlatformAccessBand locale={locale} messages={messages} />
            </Reveal>
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
                    Need help choosing?
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                    We can point you to the right product and access route.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                    Contact the team if you need guidance on product fit, pricing, or which platform to open first.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <ButtonLink
                    href={withLocalePrefix(locale, "/contact")}
                    size="lg"
                    variant="primary"
                  >
                    {messages.common.contactTeam}
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, "/pricing")}
                    size="lg"
                    variant="secondary"
                  >
                    {messages.common.viewPricing}
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
