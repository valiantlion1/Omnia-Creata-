import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

function getStatusClass(status: "live" | "preview" | "planned") {
  if (status === "live") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "preview") {
    return "border-sky-200/20 bg-sky-200/10 text-sky-100";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-200";
}

function getStatusLabel(
  status: "live" | "preview" | "planned",
  messages: ReturnType<typeof getMessages>,
) {
  if (status === "live") {
    return messages.common.live;
  }

  if (status === "preview") {
    return messages.common.preview;
  }

  return messages.common.planned;
}

function formatSurface(surface: "web" | "ios" | "android" | "pwa" | "desktop") {
  if (surface === "ios") return "iOS";
  if (surface === "android") return "Android";
  if (surface === "web") return "Web";
  if (surface === "desktop") return "Desktop";
  return "PWA";
}

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
  const supportingProducts = products.slice(1);
  const liveCount = products.filter((product) => product.status === "live").length;
  const previewCount = products.filter((product) => product.status === "preview").length;
  const plannedCount = products.filter((product) => product.status === "planned").length;

  return (
    <>
      <section className="relative px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div className="max-w-[44rem]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {messages.nav.products}
                </p>
                <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-[4.9rem]">
                  Open the right Omnia product from one calm directory.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground-soft">
                  The public site should tell you what each product is for, where it is live,
                  and why Studio stays the natural entry point.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
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

                <div className="mt-8 grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Products
                    </p>
                    <p className="text-base font-semibold text-foreground">{products.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Public access
                    </p>
                    <p className="text-base font-semibold text-foreground">Visible before entry</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Flagship route
                    </p>
                    <p className="text-base font-semibold text-foreground">{studio.name}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      Studio-first system
                    </p>
                    <p className="mt-2 text-sm text-foreground-soft">
                      One calm front door, then product-specific routes when the work becomes more
                      specialized.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                    {messages.common.flagshipStudio}
                  </span>
                </div>

                <div className="mt-6 max-w-3xl">
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.3rem]">
                    Start in Studio, then move outward only when the job changes.
                  </h2>
                  <p className="mt-4 text-base leading-8 text-foreground-soft">
                    The directory should not feel like a pile of feature cards. It should explain
                    how the ecosystem is structured, which surfaces are live, and where the next
                    useful action is.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      01
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Studio is the anchor
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Planning, review, and release stay centered in one flagship surface.
                    </p>
                  </article>
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      02
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Access stays honest
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Live, preview, and planned surfaces are visible before anyone commits.
                    </p>
                  </article>
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      03
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Every route earns its weight
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Each product should read like software with a specific role, not a shiny tile.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.84fr_1.16fr]">
              <SectionHeader
                description="The flagship should explain why the ecosystem coheres before anything else competes for attention."
                eyebrow="Studio entry"
                title={`${studio.name} stays at the center.`}
              />
              <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${getStatusClass(studio.status)}`}>
                    {getStatusLabel(studio.status, messages)}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted">
                    {studio.badge}
                  </span>
                </div>

                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.4rem]">
                  {studio.headline}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-foreground-soft">
                  {studio.roleDescription}
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {studio.capabilityHighlights.slice(0, 3).map((highlight, index) => (
                    <article
                      key={highlight.title}
                      className="border-t border-white/[0.08] pt-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        0{index + 1}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {highlight.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-foreground-soft">
                        {highlight.description}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3 border-t border-white/[0.08] pt-6">
                  <ButtonLink
                    href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                    size="lg"
                    variant="primary"
                  >
                    {messages.common.viewProduct}
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, studio.primaryCTA.href)}
                    size="lg"
                    variant="secondary"
                  >
                    {studio.primaryCTA.label}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.84fr_1.16fr]">
              <SectionHeader
                description="The supporting products should read like clear next routes, not a decorative marketplace."
                eyebrow="Product directory"
                title="The rest of the ecosystem stays specific."
              />
              <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.62),rgba(9,13,18,0.92))]">
                {supportingProducts.map((product) => (
                  <article
                    key={product.slug}
                    className="grid gap-5 border-t border-white/[0.08] px-5 py-6 first:border-t-0 md:grid-cols-[0.8fr_1.2fr_auto] md:px-6"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                          {product.name}
                        </h2>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${getStatusClass(product.status)}`}>
                          {getStatusLabel(product.status, messages)}
                        </span>
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                        {product.surfaceType.map(formatSurface).join(", ")}
                      </p>
                    </div>

                    <div className="max-w-2xl">
                      <p className="text-base leading-8 text-foreground-soft">
                        {product.shortDescription}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-foreground-soft">
                        {product.roleTitle}
                      </p>
                    </div>

                    <div className="md:justify-self-end">
                      <ButtonLink
                        className="w-full md:w-auto"
                        href={withLocalePrefix(locale, `/products/${product.slug}`)}
                        size="md"
                        variant="secondary"
                      >
                        {messages.common.viewProduct}
                      </ButtonLink>
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
            <div className="grid gap-10 xl:grid-cols-[0.84fr_1.16fr]">
              <SectionHeader
                description="Public product access should stay explicit instead of hiding behind glossy layout tricks."
                eyebrow="Access model"
                title="Live, preview, and planned should mean something."
              />
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                    {messages.common.live}
                  </span>
                  <p className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {liveCount}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground-soft">
                    Public routes are ready to open and already belong inside the core product story.
                  </p>
                </article>
                <article className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
                  <span className="inline-flex rounded-full border border-sky-200/20 bg-sky-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                    {messages.common.preview}
                  </span>
                  <p className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {previewCount}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground-soft">
                    Surfaces are visible as emerging routes, but they should still point back to a live path.
                  </p>
                </article>
                <article className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-200">
                    {messages.common.planned}
                  </span>
                  <p className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {plannedCount}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground-soft">
                    Planned routes stay honest by explaining the intended surface without pretending they are open.
                  </p>
                </article>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-12 pt-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-6 border-t border-white/[0.08] pt-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  Need a route?
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.5rem]">
                  We can point you to the right product, access path, and commercial fit.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                  If the right route is not obvious yet, contact us and we will help you start in
                  the right place.
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
          </Reveal>
        </div>
      </section>
    </>
  );
}
