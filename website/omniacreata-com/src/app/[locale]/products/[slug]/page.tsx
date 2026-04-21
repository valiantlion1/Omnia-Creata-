import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformMatrix } from "@/components/marketing/platform-matrix";
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
  const statusLabel =
    product.status === "live"
      ? messages.common.live
      : product.status === "preview"
        ? messages.common.preview
        : messages.common.planned;
  const statusClass =
    product.status === "live"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : product.status === "preview"
        ? "border-sky-200/20 bg-sky-200/10 text-sky-100"
        : "border-white/10 bg-white/[0.05] text-zinc-200";
  const surfaceSummary = product.surfaceType
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
    .join(", ");

  return (
    <>
      <section className="relative px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.84fr_1.16fr] xl:items-start">
              <div className="max-w-[42rem]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {messages.nav.products}
                </p>
                <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-[4.8rem]">
                  {product.name}
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground-soft">
                  {product.shortDescription}
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
                    href={withLocalePrefix(locale, "/contact")}
                    size="lg"
                    variant="secondary"
                  >
                    {messages.common.contactTeam}
                  </ButtonLink>
                </div>

                <div className="mt-8 grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Status
                    </p>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Surfaces
                    </p>
                    <p className="text-base font-semibold text-foreground">{surfaceSummary}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Access
                    </p>
                    <p className="text-base font-semibold text-foreground">Public product hub</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      Product role
                    </p>
                    <p className="mt-2 text-sm text-foreground-soft">{product.roleTitle}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-6 max-w-3xl">
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.4rem]">
                    {product.headline}
                  </h2>
                  <p className="mt-4 text-base leading-8 text-foreground-soft">
                    {product.roleDescription}
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {highlights.map((feature, index) => (
                    <article
                      key={feature.title}
                      className="border-t border-white/[0.08] pt-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        0{index + 1}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-foreground-soft">
                        {feature.description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10" id="overview">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionHeader
                description={product.subheadline}
                eyebrow={messages.sections.overview}
                title="Why this product exists."
              />
              <div className="space-y-5">
                <p className="text-base leading-8 text-foreground-soft">
                  {product.summary}
                </p>
                <p className="text-base leading-8 text-foreground-soft">
                  {product.roleDescription}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10" id="access">
        <div className="mx-auto max-w-[1320px]">
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
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr]">
              <SectionHeader
                description="A short view of where this product adds value inside Omnia Creata."
                eyebrow={messages.sections.capabilities}
                title="What it does best"
              />
              <div className="space-y-5">
                {product.capabilityHighlights.map((feature, index) => (
                  <article
                    key={feature.title}
                    className="border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        0{index + 1}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                          {feature.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-foreground-soft">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr]">
              <SectionHeader
                description="Move to the products that connect most closely with this one."
                eyebrow={messages.sections.ecosystemRole}
                title="How it fits inside Omnia"
              />
              <div className="space-y-6">
                <div className="space-y-5">
                  {product.ecosystemPoints.map((point, index) => (
                    <article
                      key={point.title}
                      className="border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start gap-4">
                        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                          0{index + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                            {point.title}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-foreground-soft">
                            {point.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                    {messages.sections.relatedProducts}
                  </p>
                  <div className="mt-4">
                    {companionProducts.map((companion) => (
                      <ButtonLink
                        key={companion.slug}
                        className="mb-3 flex h-auto w-full items-center justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-left text-foreground hover:bg-white/[0.05]"
                        href={withLocalePrefix(locale, `/products/${companion.slug}`)}
                        size="md"
                        variant="ghost"
                      >
                        <span className="min-w-0 text-left">
                          <span className="block text-base font-semibold tracking-[-0.03em] text-foreground">
                            {companion.name}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-foreground-soft">
                            {companion.shortDescription}
                          </span>
                        </span>
                        <span className="ml-4 shrink-0 text-sm text-accent">
                          {messages.common.viewProduct}
                        </span>
                      </ButtonLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
