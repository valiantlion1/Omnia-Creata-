import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  studioPrimaryHref,
  studioPrimaryLabel,
  withLocalePrefix,
} from "@/lib/utils";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const workflowPoints = [
  {
    title: "Studio",
    label: "First product",
    description: "Shape direction, generate, keep the selects, and return to the work.",
    href: "/products/omnia-creata-studio",
    cta: "Open Studio",
  },
  {
    title: "Products",
    label: "What is next",
    description: "More creative tools can join the system when they are ready.",
    href: "/products",
    cta: "View products",
  },
  {
    title: "Ecosystem",
    label: "Connected",
    description: "Assets, prompts, accounts, and future products can work together.",
    href: "/about",
    cta: "Explore ecosystem",
  },
];

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/",
    title: "OmniaCreata",
    description:
      "OmniaCreata is the public home for creative software, starting with OmniaCreata Studio.",
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <section className="home-showcase relative overflow-hidden px-6 pb-8 pt-16 sm:px-8 lg:px-10">
        <div className="home-showcase__glow" />
        <div className="relative mx-auto grid max-w-[1340px] gap-12 lg:min-h-[650px] lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="home-showcase__copy">
            <p className="site-kicker">Creative software ecosystem</p>
            <h1 className="home-wordmark mt-7">OmniaCreata</h1>
            <p className="mt-8 max-w-xl text-[2rem] leading-[1.25] text-foreground-soft sm:text-[2.45rem]">
              Software for image work with taste.
            </p>
            <p className="mt-7 max-w-lg text-base leading-8 text-foreground-soft">
              Studio is where the work starts.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel()}
              </ButtonLink>
              <ButtonLink href={withLocalePrefix(locale, "/products")} size="lg" variant="secondary">
                Explore ecosystem
              </ButtonLink>
            </div>
          </div>

          <div className="home-hero-art">
            <Image
              alt="OmniaCreata Studio and ecosystem visual"
              className="home-hero-art__image"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              src="/images/omnia-home-hero-art-v1.png"
            />
          </div>
        </div>
      </section>

      <section className="home-ecosystem px-6 pb-16 pt-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1340px] gap-12 border-t border-white/[0.1] pt-10 lg:grid-cols-[0.34fr_0.66fr]">
          <div className="space-y-4">
            <p className="site-kicker">The ecosystem</p>
            <h2 className="site-title max-w-[12ch]">Built for a creative operating system.</h2>
            <p className="site-copy">One place for direction, creation, and everything around it.</p>
          </div>

          <div className="home-ecosystem-grid">
            {workflowPoints.map((item) => (
              <article className="home-ecosystem-card" key={item.title}>
                <div className="home-ecosystem-card__icon" />
                <div>
                  <p>{item.title}</p>
                  <span>{item.label}</span>
                </div>
                <div className="home-ecosystem-card__rule" />
                <p className="home-ecosystem-card__copy">{item.description}</p>
                <ButtonLink href={withLocalePrefix(locale, item.href)} size="md" variant="ghost">
                  {item.cta}
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
