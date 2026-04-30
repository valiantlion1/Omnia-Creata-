import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

const useCases = [
  "Character and portrait work",
  "Concept art and key visuals",
  "Product and editorial imagery",
  "Moodboards and visual exploration",
];

const workflowSteps = [
  {
    title: "Brief",
    description: "Start with the goal, references, and the first prompt.",
  },
  {
    title: "Create",
    description: "Generate and edit with the model family that fits the job.",
  },
  {
    title: "Review",
    description: "Compare variations, keep the strongest outputs, and return to them later.",
  },
];

const modelFamilies = ["FLUX.2 Pro", "FLUX.2 Dev", "FLUX.2 Schnell", "Runware Fast", "Runware Standard", "Runware Premium"];

function formatSurface(surface: "web" | "ios" | "android" | "pwa" | "desktop") {
  if (surface === "ios") return "iOS";
  if (surface === "android") return "Android";
  if (surface === "desktop") return "Desktop";
  if (surface === "pwa") return "PWA";
  return "Web";
}

function formatStatus(status: "live" | "preview" | "planned") {
  if (status === "live") return "Available";
  if (status === "preview") return "In preparation";
  return "Contact us";
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
    <section className="site-page">
      <div className="site-page-inner">
        <div className="site-page-hero lg:grid-cols-[0.82fr_1.18fr]">
          <div className="site-page-copy">
            <p className="site-kicker">Studio</p>
            <h1 className="site-page-title">
              {product.name.replace(" Studio", "")} <strong>Studio</strong>
            </h1>
            <p className="site-page-lede">
              A focused workspace for image work, currently being prepared for public access.
            </p>
            <div className="site-page-actions">
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel()}
              </ButtonLink>
              <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="secondary">
                Contact
              </ButtonLink>
            </div>
          </div>

          <div className="site-page-visual">
            <div className="site-page-visual__caption">
              <span>In preparation</span>
              <strong>Direction, generation, review, and saved selects in one workspace.</strong>
            </div>
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Overview</p>
            <h2 className="site-title max-w-[11ch]">
              The image workflow stays together.
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

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Workflow</p>
            <h2 className="site-title max-w-[10ch]">From brief to saved select.</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <article className="site-premium-card p-5" key={step.title}>
                <strong className="text-lg text-foreground">{step.title}</strong>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">{step.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Model families</p>
            <h2 className="site-title max-w-[10ch]">Model details will stay current.</h2>
            <p className="site-copy">
              Exact model variants and credit costs will be published with the product surface.
            </p>
          </div>

          <div className="flex flex-wrap content-start gap-3">
            {modelFamilies.map((family) => (
              <span className="site-status-pill" data-status="preview" key={family}>
                {family}
              </span>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Use it for</p>
            <h2 className="site-title max-w-[10ch]">Work worth coming back to.</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {useCases.map((item) => (
              <div key={item} className="site-line-item">
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Access</p>
            <h2 className="site-title max-w-[9ch]">Access will be published when ready.</h2>
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
