import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatureCard } from "@/components/marketing/feature-card";
import { HQHeroScene } from "@/components/marketing/hq-hero-scene";
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

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/",
    title: "Omnia Creata",
    description:
      "Official public website for the Omnia Creata product ecosystem across web, mobile, desktop, and PWA surfaces.",
  });
}

export default async function LocaleHomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const products = getProducts(locale);
  const studio = products[0];
  const supportingProducts = products.slice(1);
  const trustSignals = [
    {
      title: "Direct product routes",
      description: "Every main action leads to a real destination instead of a dead-end showcase.",
    },
    {
      title: "Clear platform visibility",
      description: "Platform access stays visible before users commit to a product.",
    },
    {
      title: "Premium brand presence",
      description: "The site is structured like a long-term software company, not a temporary campaign page.",
    },
    {
      title: "Scalable HQ structure",
      description: "The main website can grow with new surfaces, pricing, and product access without losing clarity.",
    },
  ];
  const studioHighlights = [
    {
      title: "One flagship workspace",
      description: "Plan, review, and release work from the product that anchors the ecosystem.",
    },
    {
      title: "Shared product flow",
      description: "Keep prompts, visuals, operations, and monitoring closer to one central starting point.",
    },
    {
      title: "Clear public access",
      description: "Use Studio when users need the strongest first entry into Omnia Creata.",
    },
  ];
  const heroStats = [
    { label: "Flagship products", value: "5" },
    { label: "Access model", value: "Direct product hubs" },
    { label: "Platform surfaces", value: "Web, iOS, Android, PWA, desktop" },
  ];

  return (
    <>
      <section className="relative overflow-hidden px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto grid max-w-7xl gap-14 xl:grid-cols-[0.98fr_1.02fr] xl:items-center">
          <Reveal className="relative">
            <div className="max-w-[42rem] space-y-9">
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-[rgba(217,181,109,0.16)] bg-white/[0.03] px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {messages.home.heroEyebrow}
                </span>
                <span className="h-1 w-1 rounded-full bg-accent/80" />
                <span className="text-sm text-foreground-soft">{messages.home.utilityDescription}</span>
              </div>

              <div className="space-y-6">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-7xl xl:text-[5.9rem]">
                  {messages.home.heroTitle}
                </h1>
                <p className="max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
                  {messages.home.heroDescription}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ButtonLink
                  href={withLocalePrefix(locale, "/products")}
                  size="lg"
                  variant="primary"
                >
                  {messages.common.exploreEcosystem}
                </ButtonLink>
                <ButtonLink
                  href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                  size="lg"
                  variant="secondary"
                >
                  {messages.common.openStudio}
                </ButtonLink>
                <ButtonLink
                  href={withLocalePrefix(locale, "/contact")}
                  size="lg"
                  variant="ghost"
                >
                  {messages.common.contactTeam}
                </ButtonLink>
              </div>

              <div className="grid gap-4 border-t border-white/8 pt-6 sm:grid-cols-3">
                {heroStats.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      {item.label}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <HQHeroScene locale={locale} products={products} />
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10" id="ecosystem">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              description={messages.home.ecosystemDescription}
              eyebrow={messages.home.ecosystemEyebrow}
              title={messages.home.ecosystemTitle}
            />
          </Reveal>
          <div className="mt-12 grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
            <Reveal>
              <ProductCard
                featured
                locale={locale}
                messages={messages}
                product={studio}
              />
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {supportingProducts.map((product, index) => (
                <Reveal key={product.slug} delay={index * 70}>
                  <ProductCard
                    locale={locale}
                    messages={messages}
                    product={product}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10" id="platforms">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <PlatformAccessBand locale={locale} messages={messages} />
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="luxury-panel gold-outline overflow-hidden rounded-[38px] p-7 sm:p-10">
              <div className="grid gap-8 xl:grid-cols-[0.96fr_1.04fr] xl:items-start">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                    {messages.common.flagshipStudio}
                  </p>
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
                    {studio.name}
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
                    {studio.summary}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink
                      href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                      size="lg"
                      variant="primary"
                    >
                      {messages.common.openStudio}
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

                <div className="grid gap-4 sm:grid-cols-3">
                  {studioHighlights.map((feature, index) => (
                    <FeatureCard
                      key={feature.title}
                      description={feature.description}
                      index={`0${index + 1}`}
                      title={feature.title}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="luxury-panel gold-outline rounded-[36px] p-7 sm:p-9">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                  {messages.home.trustEyebrow}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                  {messages.home.trustTitle}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                  {messages.home.trustDescription}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink
                    href={withLocalePrefix(locale, "/products")}
                    size="lg"
                    variant="primary"
                  >
                    {messages.common.exploreEcosystem}
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, "/contact")}
                    size="lg"
                    variant="secondary"
                  >
                    {messages.common.contactTeam}
                  </ButtonLink>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {trustSignals.map((signal, index) => (
                  <Reveal key={signal.title} delay={index * 70}>
                    <FeatureCard
                      description={signal.description}
                      title={signal.title}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
