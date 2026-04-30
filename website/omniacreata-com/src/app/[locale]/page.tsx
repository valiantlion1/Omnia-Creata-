import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const companyPoints = [
  {
    title: "Company",
    label: "Image work",
    description: "OmniaCreata is focused on software for serious visual creation.",
    href: "/about",
    cta: "About",
  },
  {
    title: "Studio",
    label: "In preparation",
    description: "Studio will be introduced when the product is ready for public access.",
    href: "/contact",
    cta: "Contact",
  },
  {
    title: "Contact",
    label: "Direct address",
    description: "Use the official contact address for product, billing, legal, and partnership questions.",
    href: "/contact",
    cta: "Email us",
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
      "OmniaCreata builds creative software for image work.",
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
        <Image
          alt=""
          aria-hidden="true"
          className="home-showcase__image"
          fill
          priority
          sizes="100vw"
          src="/images/omnia-home-hero-global.jpg"
        />
        <div className="home-showcase__shade" />

        <div className="relative mx-auto flex min-h-[calc(100svh-7rem)] max-w-[1340px] flex-col justify-end gap-12 pb-10 pt-24 lg:min-h-[760px]">
          <div className="home-showcase__copy max-w-[900px]">
            <p className="site-kicker">Creative software company</p>
            <h1 className="home-wordmark mt-7">OmniaCreata</h1>
            <p className="mt-8 max-w-xl text-[2rem] leading-[1.25] text-foreground-soft sm:text-[2.45rem]">
              Software for image work with taste.
            </p>
            <p className="mt-7 max-w-lg text-base leading-8 text-foreground-soft">
              Studio is being prepared. The public site stays simple until access is ready.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="primary">
                Contact
              </ButtonLink>
              <ButtonLink href={withLocalePrefix(locale, "/about")} size="lg" variant="secondary">
                About
              </ButtonLink>
            </div>
          </div>

          <div className="home-hero-flow">
            {companyPoints.map((item) => (
              <ButtonLink
                className="home-hero-flow__item"
                href={withLocalePrefix(locale, item.href)}
                key={item.title}
                size="md"
                variant="ghost"
              >
                <span>{item.title}</span>
                <small>{item.label}</small>
              </ButtonLink>
            ))}
          </div>
        </div>
      </section>

      <section className="home-focus px-6 pb-16 pt-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1340px] gap-12 border-t border-white/[0.1] pt-10 lg:grid-cols-[0.34fr_0.66fr]">
          <div className="space-y-4">
            <p className="site-kicker">Focus</p>
            <h2 className="site-title max-w-[12ch]">One clear public site.</h2>
            <p className="site-copy">
              OmniaCreata will publish product access only when it is ready. Until then, the main
              site stays clear: company, contact, and legal information.
            </p>
          </div>

          <div className="home-focus-grid">
            {companyPoints.map((item) => (
              <article className="home-focus-card" key={item.title}>
                <div>
                  <p>{item.title}</p>
                  <span>{item.label}</span>
                </div>
                <div className="home-focus-card__rule" />
                <p className="home-focus-card__copy">{item.description}</p>
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
