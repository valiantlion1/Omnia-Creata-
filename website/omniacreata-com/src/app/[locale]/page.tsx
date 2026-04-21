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
      title: "Direct routes beat decorative marketing",
      description: "Every primary action should move someone into a real surface instead of a dead-end brand moment.",
    },
    {
      title: "Studio-first is more honest",
      description: "The flagship should lead because it has the strongest public story today, not because every product must look equally mature.",
    },
    {
      title: "Context stays visible",
      description: "Platform availability, product roles, and next-step decisions remain readable before commitment.",
    },
    {
      title: "The shell should stay calm",
      description: "A quieter HQ survives growth better than a louder campaign page trying to impress every second.",
    },
  ];
  const studioHighlights = [
    {
      title: "One flagship entry",
      description: "Studio is the public route that can carry the most weight right now, so the homepage should lead there without apology.",
    },
    {
      title: "Connected product surfaces",
      description: "The rest of Omnia stays visible as linked product lanes with honest roles, availability, and direct routes.",
    },
    {
      title: "Proof over theater",
      description: "Real routes, product roles, and clear access context matter more than luxury styling trying to sell maturity.",
    },
  ];
  const heroStats = [
    { label: "Flagship now", value: "Studio" },
    { label: "Public products", value: "5" },
    { label: "HQ job", value: "Access, routing, contact" },
  ];
  const operatingPrinciples = [
    {
      title: "Let the flagship carry the first impression",
      description: "Studio is the clearest public entry today, so the site should make that obvious instead of flattening every surface into the same weight.",
    },
    {
      title: "Keep the ecosystem visible without pretending it is finished",
      description: "The other products still matter, but they should read as connected lanes around Studio rather than identical headline products.",
    },
    {
      title: "Make the next move effortless",
      description: "A good HQ page should help people orient, choose a route, and move, not linger inside decorative marketing structure.",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto grid max-w-[1320px] gap-14 xl:grid-cols-[0.84fr_1.16fr] xl:items-center">
          <Reveal className="relative">
            <div className="max-w-[42rem] space-y-8">
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {messages.home.heroEyebrow}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="text-sm text-foreground-soft">omniacreata.com</span>
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-[4.6rem] xl:text-[5rem]">
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

              <div className="grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
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
            <HQHeroScene locale={locale} messages={messages} products={products} />
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10" id="ecosystem">
        <div className="mx-auto grid max-w-[1320px] gap-10 xl:grid-cols-[0.74fr_1.26fr]">
          <Reveal>
            <div className="max-w-[36rem]">
              <SectionHeader
                description={messages.home.ecosystemDescription}
                eyebrow={messages.home.ecosystemEyebrow}
                title={messages.home.ecosystemTitle}
              />
              <div className="mt-8 space-y-5">
                {operatingPrinciples.map((item) => (
                  <article
                    key={item.title}
                    className="border-t border-white/[0.08] pt-4"
                  >
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
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
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <PlatformAccessBand locale={locale} messages={messages} />
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-3">
              {studioHighlights.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  description={feature.description}
                  index={`0${index + 1}`}
                  title={feature.title}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-9">
              <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                    {messages.home.trustEyebrow}
                  </p>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                    {messages.home.trustTitle}
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-foreground-soft">
                    {messages.home.trustDescription}
                  </p>
                  <div className="flex flex-wrap gap-3">
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
                  {trustSignals.map((signal) => (
                    <article
                      key={signal.title}
                      className="border-t border-white/[0.08] pt-4"
                    >
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {signal.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-foreground-soft">
                        {signal.description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
