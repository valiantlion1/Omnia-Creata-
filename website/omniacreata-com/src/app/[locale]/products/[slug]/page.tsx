import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PageHero } from "@/components/marketing/page-hero";
import { PlatformBadge } from "@/components/marketing/platform-badge";
import { PlatformMatrix } from "@/components/marketing/platform-matrix";
import { ProductCard } from "@/components/marketing/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import {
  getProductBySlug,
  getProducts,
  products,
  type ProductSlug,
} from "@/content/products";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

const conciseHighlights: Record<
  ProductSlug,
  Array<{
    title: string;
    description: string;
  }>
> = {
  "omnia-creata-studio": [
    {
      title: "Plan in one place",
      description: "Keep direction, review, and release work in one central workspace.",
    },
    {
      title: "Stay cross-product",
      description: "Use Studio as the main entry when work touches multiple Omnia Creata products.",
    },
    {
      title: "Move faster",
      description: "Make decisions with a cleaner flow from idea to release.",
    },
  ],
  omniapixels: [
    {
      title: "Generate visuals",
      description: "Create visual output from a product surface built for repeat use.",
    },
    {
      title: "Refine assets",
      description: "Improve images without leaving the Omnia Creata ecosystem.",
    },
    {
      title: "Deliver faster",
      description: "Keep final visual work closer to the rest of your release flow.",
    },
  ],
  omniaorganizer: [
    {
      title: "See priorities clearly",
      description: "Keep projects, timing, and ownership visible without dashboard clutter.",
    },
    {
      title: "Support daily work",
      description: "Stay useful on web and mobile for fast operational decisions.",
    },
    {
      title: "Keep momentum",
      description: "Turn plans into visible progress across the ecosystem.",
    },
  ],
  "prompt-vault": [
    {
      title: "Store prompt systems",
      description: "Keep prompt knowledge organized instead of scattered across notes.",
    },
    {
      title: "Reuse what works",
      description: "Bring high-value prompts back into Studio and OmniaPixels faster.",
    },
    {
      title: "Build long-term memory",
      description: "Treat prompts like durable product assets instead of temporary experiments.",
    },
  ],
  "omnia-watch": [
    {
      title: "See product health",
      description: "Keep quality, performance, and operational signals in one monitoring product.",
    },
    {
      title: "Catch issues earlier",
      description: "Notice drift and changes before they become bigger problems.",
    },
    {
      title: "Close the loop",
      description: "Keep monitoring connected to the products that create and manage the work.",
    },
  ],
};

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const product = getProductBySlug(slug, locale);

  if (!product) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: product.name,
    description: product.summary,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const localizedProducts = getProducts(locale);
  const product = getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  const messages = getMessages(locale);
  const companionProducts = product.companionSlugs
    .map((companionSlug) =>
      localizedProducts.find((item) => item.slug === companionSlug),
    )
    .filter((item): item is (typeof localizedProducts)[number] => Boolean(item));
  const highlights = conciseHighlights[product.slug];

  return (
    <>
      <PageHero
        actions={[
          {
            href: withLocalePrefix(locale, product.primaryCTA.href),
            label: product.primaryCTA.label,
          },
          {
            href: withLocalePrefix(locale, "/contact"),
            label: messages.common.contactTeam,
            variant: "secondary",
          },
        ]}
        description={product.shortDescription}
        eyebrow={messages.nav.products}
        meta={[
          {
            label: messages.common.productPlatforms,
            value: product.surfaceType
              .map((surface) =>
                surface === "ios"
                  ? "iOS"
                  : surface === "android"
                    ? "Android"
                    : surface === "web"
                      ? "Web"
                      : surface === "desktop"
                        ? "Desktop"
                        : "PWA",
              )
              .join(", "),
          },
          {
            label: "Access",
            value: "Public product hub",
          },
          {
            label: "Domain",
            value: "omniacreata.com",
          },
        ]}
        title={product.name}
        locale={locale}
      />

      <section className="px-6 py-10 sm:px-8 lg:px-10" id="overview">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              description={product.summary}
              eyebrow={messages.sections.overview}
              title={`${product.name}, at a glance.`}
            />
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal>
              <div className="luxury-panel gold-outline rounded-[34px] p-7 sm:p-9">
                <p className="text-base leading-8 text-foreground-soft">
                  {product.summary}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink
                    href={withLocalePrefix(locale, product.primaryCTA.href)}
                    size="lg"
                    variant="primary"
                  >
                    {product.primaryCTA.label}
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
            </Reveal>

            <div className="grid gap-5">
              <Reveal delay={80}>
                <FeatureCard
                  description={product.shortDescription}
                  title="What it does"
                />
              </Reveal>
              <Reveal delay={140}>
                <div className="soft-panel rounded-[30px] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                    Product surfaces
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {product.platformMatrix.map((entry) => (
                      <PlatformBadge
                        key={`${product.slug}-${entry.platform}`}
                        platform={entry.platform}
                      />
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10" id="access">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              description="Choose the platform you want to use and continue with a live route or an access fallback."
              eyebrow={messages.sections.access}
              title="Platform access"
            />
          </Reveal>
          <div className="mt-10">
            <Reveal delay={80}>
              <PlatformMatrix locale={locale} messages={messages} product={product} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10" id="capabilities">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeader
              description="A short view of where this product adds value inside Omnia Creata."
              eyebrow={messages.sections.capabilities}
              title="Key highlights"
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {highlights.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 70}>
                <FeatureCard
                  description={feature.description}
                  index={`0${index + 1}`}
                  title={feature.title}
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
              description="Move to the products that connect most closely with this one."
              eyebrow={messages.sections.relatedProducts}
              title="Related products"
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {companionProducts.map((companion, index) => (
              <Reveal key={companion.slug} delay={index * 70}>
                <ProductCard
                  locale={locale}
                  messages={messages}
                  product={companion}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
