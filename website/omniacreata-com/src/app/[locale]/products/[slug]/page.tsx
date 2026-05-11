import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { StudioMotionScene } from "@/components/site/studio-motion-scene";
import { ButtonLink } from "@/components/ui/button";
import { getProductBySlug, products } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  STUDIO_PREVIEW_AVAILABLE,
  studioPrimaryHref,
  studioPrimaryLabel,
  withLocalePrefix,
} from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

function getProductPageCopy(locale: string) {
  if (locale === "tr") {
    return {
      talkToUs: "Konusalim",
      overview: "Genel bakis",
      overviewTitle: "Yon, uretim ve inceleme birlikte kalir.",
      useItFor: "Kullanim alanlari",
      useItForTitle: "Tekrar tekrar donecegin isler.",
      access: "Erisim",
      accessTitle: "Once web. Diger her sey sirasi gelince.",
      useCases: [
        "Karakter ve portre isleri",
        "Konsept art ve key visual",
        "Urun ve editorial gorseller",
        "Moodboard ve gorsel kesif",
      ],
      surfaces: {
        web: "Web",
        pwa: "PWA",
        desktop: "Masaustu",
        ios: "iOS",
        android: "Android",
      },
      statuses: {
        live: "Canli",
        preview: "Onizleme",
        planned: "Planli",
      },
    };
  }

  return {
    talkToUs: "Talk to us",
    overview: "Overview",
    overviewTitle: "Direction, generation, and review stay together.",
    useItFor: "Use it for",
    useItForTitle: "The work you come back to again and again.",
    access: "Access",
    accessTitle: "Web first. Everything else earns its turn.",
    useCases: [
      "Character and portrait work",
      "Concept art and key visuals",
      "Product and editorial imagery",
      "Moodboards and visual exploration",
    ],
    surfaces: {
      web: "Web",
      pwa: "PWA",
      desktop: "Desktop",
      ios: "iOS",
      android: "Android",
    },
    statuses: {
      live: "Live",
      preview: "Preview",
      planned: "Planned",
    },
  };
}

function formatSurface(
  surface: "web" | "ios" | "android" | "pwa" | "desktop",
  copy: ReturnType<typeof getProductPageCopy>,
) {
  return copy.surfaces[surface];
}

function formatStatus(
  status: "live" | "preview" | "planned",
  copy: ReturnType<typeof getProductPageCopy>,
) {
  return copy.statuses[status];
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
  const copy = getProductPageCopy(locale);

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
                {studioPrimaryLabel(locale)}
              </ButtonLink>
              <ButtonLink
                href={`${withLocalePrefix(locale, "/contact")}?intent=studio_preview`}
                size="lg"
                variant="secondary"
              >
                {copy.talkToUs}
              </ButtonLink>
            </div>
          </div>

          <StudioMotionScene variant="product" />
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">{copy.overview}</p>
            <h2 className="site-title max-w-[11ch]">{copy.overviewTitle}</h2>
            <p className="site-copy">{product.summary}</p>
          </div>

          <div className="site-line-list">
            {product.capabilityHighlights.map((item) => (
              <Fragment key={item.title}>
                <article className="site-line-item">
                  <h3>{item.title} </h3>
                  <p>{`${item.description}\u00a0`}</p>
                  <span className="sr-only">&nbsp;</span>
                </article>
                {" "}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">{copy.useItFor}</p>
            <h2 className="site-title max-w-[10ch]">{copy.useItForTitle}</h2>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {copy.useCases.map((item) => (
              <Fragment key={item}>
                <li className="site-line-item">
                  <strong>{`${item}\u00a0`}</strong>
                  <span className="sr-only">&nbsp;</span>
                </li>
                {" "}
              </Fragment>
            ))}
          </ul>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">{copy.access}</p>
            <h2 className="site-title max-w-[9ch]">{copy.accessTitle}</h2>
            <p className="site-copy">{product.roleDescription}</p>
          </div>

          <div className="site-line-list">
            {product.platformMatrix.map((entry) => (
              <Fragment key={`${entry.platform}-${entry.status}`}>
                <article className="site-line-item md:grid md:grid-cols-[0.72fr_1fr_auto] md:items-center md:gap-4 md:pt-5">
                  <h3>{formatSurface(entry.platform, copy)} </h3>
                  <p>{`${entry.note}\u00a0`}</p>
                  <div className="flex items-center gap-3 md:justify-self-end">
                    {entry.platform === "web" && STUDIO_PREVIEW_AVAILABLE ? (
                      <ButtonLink href={studioPrimaryHref(locale)} size="md" variant="primary">
                        {studioPrimaryLabel(locale)}
                      </ButtonLink>
                    ) : (
                      <span
                        aria-label={`${formatSurface(entry.platform, copy)} status: ${formatStatus(entry.status, copy)}`}
                        className="site-status-pill"
                        data-status={entry.status}
                      >
                        {formatStatus(entry.status, copy)}
                      </span>
                    )}
                  </div>
                  <span className="sr-only">&nbsp;</span>
                </article>
                {" "}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
