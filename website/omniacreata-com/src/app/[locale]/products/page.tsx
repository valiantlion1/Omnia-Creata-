import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  studioPrimaryHref,
  studioPrimaryLabel,
  withLocalePrefix,
} from "@/lib/utils";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const productProof = [
  {
    title: "One live path",
    description: "The public site points people into Studio without scattering attention across unfinished tools.",
  },
  {
    title: "One workflow",
    description: "Brief, generate, edit, review, and save the work you want to keep.",
  },
  {
    title: "Current model families",
    description: "The FLUX.2 family on Runware drives the catalog across Fast, Standard, and Premium lanes.",
  },
];

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
    description: "Studio leads the OmniaCreata product line.",
  });
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const studio = getProducts(locale)[0];

  return (
    <section className="site-page">
      <div className="site-page-inner">
        <div className="site-page-hero lg:grid-cols-[0.86fr_1.14fr]">
          <div className="site-page-copy">
            <p className="site-kicker">Products</p>
            <h1 className="site-page-title">
              Studio is the <strong>current product.</strong>
            </h1>
            <p className="site-page-lede">
              OmniaCreata launches around one useful workspace first. The ecosystem expands only
              when another tool has a clear job.
            </p>
            <div className="site-page-actions">
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel()}
              </ButtonLink>
              <ButtonLink
                href={withLocalePrefix(locale, "/pricing")}
                size="lg"
                variant="secondary"
              >
                View pricing
              </ButtonLink>
            </div>
          </div>

          <div className="site-page-visual">
            <div className="site-page-visual__caption">
              <span>Product line</span>
              <strong>Studio sets the standard before the ecosystem expands.</strong>
            </div>
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1fr_auto] lg:items-start">
          <article className="contents">
            <div>
              <p className="site-kicker">Current product</p>
              <h2 className="site-title mt-3 max-w-[11ch]">{studio.name}</h2>
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
                Product page
              </ButtonLink>
            </div>
          </article>
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4">
            <p className="site-kicker">Product truth</p>
            <h2 className="site-title max-w-[10ch]">What is real now.</h2>
          </div>

          <div className="site-line-list">
            {productProof.map((item) => (
              <article className="site-line-item md:grid md:grid-cols-[0.38fr_1fr] md:gap-6" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
