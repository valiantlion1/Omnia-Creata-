import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioMotionScene } from "@/components/site/studio-motion-scene";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  studioAccessHref,
  studioAccessLabel,
  withLocalePrefix,
} from "@/lib/utils";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function getProductsPageCopy(locale: string) {
  if (locale === "tr") {
    return {
      metadataTitle: "Urunler",
      metadataDescription: "Studio ilk OmniaCreata urunudur.",
      kicker: "Urunler",
      title: "Tek urun, bilerek.",
      copy:
        "Su an burada public yuzde duran tek urun Studio. Bir gercek urun, raf dolusu tamamlanmamis isimden iyidir.",
      seeStudio: "Studio'yu gor",
      currentProduct: "Mevcut urun",
      productPage: "Urun sayfasi",
    };
  }

  return {
    metadataTitle: "Products",
    metadataDescription: "Studio is the first OmniaCreata product.",
    kicker: "Products",
    title: "One product, on purpose.",
    copy:
      "Studio is the only public product here right now. One real thing is better than a shelf of unfinished names.",
    seeStudio: "See Studio",
    currentProduct: "Current product",
    productPage: "Product page",
  };
}

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getProductsPageCopy(locale);

  return createPageMetadata({
    locale,
    path: "/products",
    title: copy.metadataTitle,
    description: copy.metadataDescription,
  });
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const studio = getProducts(locale)[0];
  const copy = getProductsPageCopy(locale);

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="space-y-5">
            <p className="site-kicker">{copy.kicker}</p>
            <h1 className="site-title max-w-[10ch]">{copy.title}</h1>
            <p className="site-copy">{copy.copy}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                size="lg"
                variant="secondary"
              >
                {copy.seeStudio}
              </ButtonLink>
              <ButtonLink href={studioAccessHref(locale)} size="lg" variant="primary">
                {studioAccessLabel(locale)}
              </ButtonLink>
            </div>
          </div>

          <StudioMotionScene variant="compact" />
        </div>

        <div className="site-rule mt-12 pt-8">
          <article className="grid gap-8 lg:grid-cols-[0.72fr_1fr_auto] lg:items-start">
            <div>
              <p className="site-kicker">{copy.currentProduct}</p>
              <h2 className="site-title mt-3 max-w-[9ch]">{studio.name}</h2>
            </div>

            <div className="site-stack">
              <p className="site-copy">{studio.summary}</p>
              <p className="site-copy">{studio.roleDescription}</p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ButtonLink
                href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                size="lg"
                variant="secondary"
              >
                {copy.productPage}
              </ButtonLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
