import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FeatureCard } from "@/components/marketing/feature-card";
import { HQHeroScene } from "@/components/marketing/hq-hero-scene";
import { PlatformAccessBand } from "@/components/marketing/platform-access-band";
import { ProductCard } from "@/components/marketing/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { getHomepageModules } from "@/content/homepage";
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
  const modules = getHomepageModules(locale);
  const products = getProducts(locale);
  const studio = products[0];
  const studioHighlights = [
    {
      title: "One workspace",
      description: "Plan, review, and release work without hopping across disconnected tools.",
    },
    {
      title: "Shared product flow",
      description: "Keep prompts, visual work, operations, and monitoring closer to the same entry point.",
    },
    {
      title: "Clear public access",
      description: "Use Studio as the strongest starting point when users need to enter the ecosystem fast.",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden px-6 pb-16 pt-10 sm:px-8 lg:px-10 lg:pb-24">
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] mix-blend-screen"
          fill
          priority
          src="/brand/hero-texture.png"
        />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
          <Reveal className="relative">
            <div className="space-y-8">
              <div className="inline-flex max-w-full items-center gap-4 rounded-[26px] border border-[rgba(217,181,109,0.2)] bg-[rgba(255,255,255,0.03)] px-4 py-3 backdrop-blur-xl">
                <div className="relative overflow-hidden rounded-[18px] border border-[rgba(217,181,109,0.22)] bg-black/70 px-2 py-1">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,181,109,0.2),transparent_60%)]" />
                  <Image
                    alt="Omnia Creata logo"
                    className="relative z-10 h-auto w-[124px] object-contain"
                    height={44}
                    priority
                    src="/brand/logo-transparent.png"
                    width={124}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-accent">
                    {messages.home.heroEyebrow}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground-soft sm:text-[15px]">
                    {messages.home.utilityDescription}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl xl:text-8xl">
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

              <div className="grid gap-4 sm:grid-cols-3">
                {modules.heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.28em] text-muted">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
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
              align="center"
              description={messages.home.ecosystemDescription}
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

      <section className="px-6 py-12 sm:px-8 lg:px-10" id="platforms">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              align="center"
              description={messages.home.platformBandDescription}
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

      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="luxury-panel gold-outline overflow-hidden rounded-[36px] p-7 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                    {messages.common.flagshipStudio}
                  </p>
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
                    {studio.name}
                  </h2>
                  <p className="text-base leading-8 text-foreground-soft sm:text-lg">
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
                      href={withLocalePrefix(locale, "/contact")}
                      size="lg"
                      variant="secondary"
                    >
                      {messages.common.contactTeam}
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
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="luxury-panel gold-outline rounded-[32px] p-7 sm:p-9">
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

              <div className="grid gap-5">
                {modules.trustSignals.map((signal, index) => (
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
