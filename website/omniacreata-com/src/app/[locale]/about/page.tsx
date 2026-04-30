import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  studioPrimaryHref,
  studioPrimaryLabel,
  withLocalePrefix,
} from "@/lib/utils";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const principles = [
  {
    title: "Studio first",
    description: "The company launches around one product path before expanding the ecosystem.",
  },
  {
    title: "Useful before loud",
    description: "The product should help creative work move forward, not hide weak workflow behind style.",
  },
  {
    title: "Current models, honest pricing",
    description: "Model access and credit examples stay adjustable as catalogs change.",
  },
];

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/about",
    title: "About",
    description:
      "OmniaCreata builds creative software for image work, starting with Studio.",
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <section className="site-page">
      <div className="site-page-inner">
        <div className="site-page-hero lg:grid-cols-[0.84fr_1.16fr]">
          <div className="site-page-copy">
            <p className="site-kicker">About</p>
            <h1 className="site-page-title">
              A software company, <strong>starting with Studio.</strong>
            </h1>
            <p className="site-page-lede">
              OmniaCreata builds creative software for image work. Studio is the first product and
              the main path into the ecosystem.
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
              <span>Company</span>
              <strong>A focused software company for serious creative workflows.</strong>
            </div>
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">What matters</p>
            <h2 className="site-title max-w-[11ch]">A clear product path.</h2>
          </div>

          <div className="site-line-list">
            {principles.map((item) => (
              <article className="site-line-item" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Company contact</p>
            <h2 className="site-title max-w-[10ch]">Reach the official inbox.</h2>
          </div>

          <div className="site-line-item">
            <strong>founder@omniacreata.com</strong>
            <span>
              Use the official inbox for Studio access, pricing, billing, privacy, legal, product,
              and partnership questions.
            </span>
            <div className="pt-2">
              <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="secondary">
                Contact
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
