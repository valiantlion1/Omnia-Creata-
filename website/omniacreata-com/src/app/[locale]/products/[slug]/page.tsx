import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioMotionScene } from "@/components/site/studio-motion-scene";
import { ButtonLink } from "@/components/ui/button";
import { getProductBySlug, products } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  STUDIO_PREVIEW_AVAILABLE,
  studioAccessHref,
  studioAccessLabel,
  studioPrimaryHref,
  studioPrimaryLabel,
} from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

const useCases = [
  "Character and portrait work",
  "Concept art and key visuals",
  "Product and editorial imagery",
  "Moodboards and visual exploration",
];

function formatSurface(surface: "web" | "ios" | "android" | "pwa" | "desktop") {
  if (surface === "ios") return "iOS";
  if (surface === "android") return "Android";
  if (surface === "desktop") return "Desktop";
  if (surface === "pwa") return "PWA";
  return "Web";
}

function formatStatus(status: "live" | "preview" | "planned") {
  if (status === "live") return "Live";
  if (status === "preview") return "Preview";
  return "Planned";
}

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

  const product = getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="space-y-6">
            <p className="site-kicker">Studio</p>
            <h1 className="site-title max-w-[10ch]">{product.name}</h1>
            <p className="site-copy">{product.shortDescription}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel()}
              </ButtonLink>
              <ButtonLink href={studioAccessHref(locale)} size="lg" variant="secondary">
                {studioAccessLabel()}
              </ButtonLink>
            </div>
          </div>

          <StudioMotionScene variant="product" />
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Overview</p>
            <h2 className="site-title max-w-[11ch]">
              Direction, generation, and review stay together.
            </h2>
            <p className="site-copy">{product.summary}</p>
          </div>

          <div className="site-line-list">
            {product.capabilityHighlights.map((item) => (
              <article className="site-line-item" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Use it for</p>
            <h2 className="site-title max-w-[10ch]">The work you come back to again and again.</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {useCases.map((item) => (
              <div key={item} className="site-line-item">
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Access</p>
            <h2 className="site-title max-w-[9ch]">Web first. Everything else earns its turn.</h2>
            <p className="site-copy">{product.roleDescription}</p>
          </div>

          <div className="site-line-list">
            {product.platformMatrix.map((entry) => (
              <article
                className="site-line-item md:grid md:grid-cols-[0.72fr_1fr_auto] md:items-center md:gap-4 md:pt-5"
                key={`${entry.platform}-${entry.status}`}
              >
                <strong>{formatSurface(entry.platform)}</strong>
                <span>{entry.note}</span>
                <div className="flex items-center gap-3 md:justify-self-end">
                  {entry.platform === "web" && STUDIO_PREVIEW_AVAILABLE ? (
                    <ButtonLink href={studioPrimaryHref(locale)} size="md" variant="primary">
                      {studioPrimaryLabel()}
                    </ButtonLink>
                  ) : (
                    <span className="site-status-pill" data-status={entry.status}>
                      {formatStatus(entry.status)}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
