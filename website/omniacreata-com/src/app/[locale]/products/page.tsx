import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const productProof = [
  {
    title: "In preparation",
    description: "Studio will be published when public access is ready.",
  },
  {
    title: "Narrow focus",
    description: "The product work is focused on image generation, editing, and review.",
  },
  {
    title: "No public pricing yet",
    description: "Pricing and access details will be shown when Studio is ready.",
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
    description: "Product information for OmniaCreata Studio.",
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
              Studio is <strong>in preparation.</strong>
            </h1>
            <p className="site-page-lede">
              OmniaCreata is preparing a focused workspace for image work. Public access details
              will be shown when the product is ready.
            </p>
            <div className="site-page-actions">
              <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="primary">
                Contact
              </ButtonLink>
              <ButtonLink
                href={withLocalePrefix(locale, "/about")}
                size="lg"
                variant="secondary"
              >
                About
              </ButtonLink>
            </div>
          </div>

          <div className="site-page-visual">
            <div className="site-page-visual__caption">
              <span>Product</span>
              <strong>Studio will be introduced when public access is ready.</strong>
            </div>
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1fr_auto] lg:items-start">
          <article className="contents">
            <div>
              <p className="site-kicker">Product in preparation</p>
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
                Studio details
              </ButtonLink>
            </div>
          </article>
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4">
            <p className="site-kicker">Product truth</p>
            <h2 className="site-title max-w-[10ch]">What is public now.</h2>
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
