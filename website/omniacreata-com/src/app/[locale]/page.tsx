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
    label: "Create and edit",
    description: "Generate, refine, and keep visual work in one Studio surface.",
    href: "/products/omnia-creata-studio",
    cta: "See Studio",
  },
  {
    title: "Models",
    label: "Current families",
    description: "The FLUX.2 family on Runware powers Fast, Standard, and Premium image lanes.",
    href: "/pricing",
    cta: "View pricing",
  },
  {
    title: "Credits",
    label: "Transparent usage",
    description: "Plans show monthly credits and honest examples without promising fixed output counts.",
    href: "/pricing",
    cta: "How credits work",
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
      "OmniaCreata builds creative software for image work, starting with OmniaCreata Studio.",
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
            <p className="site-kicker">Creative software ecosystem</p>
            <h1 className="home-wordmark mt-7">OmniaCreata</h1>
            <p className="mt-8 max-w-xl text-[2rem] leading-[1.25] text-foreground-soft sm:text-[2.45rem]">
              Studio for serious image work.
            </p>
            <p className="mt-7 max-w-lg text-base leading-8 text-foreground-soft">
              Create, edit, review, and keep your best outputs without losing the thread.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel()}
              </ButtonLink>
              <ButtonLink href={withLocalePrefix(locale, "/pricing")} size="lg" variant="secondary">
                View pricing
              </ButtonLink>
            </div>
          </div>

          <div className="home-hero-flow">
            {workflowPoints.map((item) => (
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

      <section className="home-ecosystem px-6 pb-16 pt-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1340px] gap-12 border-t border-white/[0.1] pt-10 lg:grid-cols-[0.34fr_0.66fr]">
          <div className="space-y-4">
            <p className="site-kicker">The ecosystem</p>
            <h2 className="site-title max-w-[12ch]">Studio is the front door.</h2>
            <p className="site-copy">
              OmniaCreata starts with the product people actually use: a focused workspace for
              image generation, editing, and review.
            </p>
          </div>

          <div className="home-ecosystem-grid">
            {workflowPoints.map((item) => (
              <article className="home-ecosystem-card" key={item.title}>
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
