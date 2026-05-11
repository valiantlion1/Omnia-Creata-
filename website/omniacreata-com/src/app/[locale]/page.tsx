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

function getHomeCopy(locale: string) {
  if (locale === "tr") {
    return {
      metadataDescription:
        "OmniaCreata, OmniaCreata Studio ile baslayan yaratici yazilimlarin public evidir.",
      heroKicker: "Yaratici yazilim ekosistemi",
      heroLine: "Zevkli gorsel uretim yazilimi.",
      heroSupport: "Studio ile is baslar.",
      ecosystemCta: "Urunleri gor",
      heroAlt: "OmniaCreata Studio ve ekosistem gorseli",
      sectionKicker: "Urunler",
      sectionTitle: "Yaratici araclar, once Studio.",
      sectionCopy:
        "OmniaCreata gorsel uretimle baslar. Yeni urunler ayni kalite cizgisinde eklenir.",
      workflowPoints: [
        {
          title: "Studio",
          label: "Aktif urun",
          description: "Gorsel uret, yonu incelt ve en guclu sonuclari elinin altinda tut.",
          href: "/products/omnia-creata-studio",
          cta: "Studio'yu gor",
        },
        {
          title: "Urunler",
          label: "Dikkatli buyur",
          description: "Yeni araclar ancak net bir isi ve yeterli kalitesi oldugunda eklenir.",
          href: "/products",
          cta: "Urunleri gor",
        },
        {
          title: "OmniaCreata",
          label: "Ana merkez",
          description: "Marka, urunler ve iletisim icin tek temiz adres.",
          href: "/about",
          cta: "OmniaCreata'yi tani",
        },
      ],
    };
  }

  return {
    metadataDescription:
      "OmniaCreata is the public home for creative software, starting with OmniaCreata Studio.",
    heroKicker: "Creative software ecosystem",
    heroLine: "Software for image work with taste.",
    heroSupport: "Studio is where the work starts.",
    ecosystemCta: "View products",
    heroAlt: "OmniaCreata Studio and ecosystem visual",
    sectionKicker: "The products",
    sectionTitle: "Creative tools, starting with Studio.",
    sectionCopy:
      "OmniaCreata starts with image work. New products join when they meet the same standard.",
    workflowPoints: [
      {
        title: "Studio",
        label: "Live product",
        description: "Create images, refine direction, and keep the strongest results close.",
        href: "/products/omnia-creata-studio",
        cta: "See Studio",
      },
      {
        title: "Products",
        label: "Growing carefully",
        description: "New tools join when they have a clear job and the quality is there.",
        href: "/products",
        cta: "View products",
      },
      {
        title: "OmniaCreata",
        label: "Home base",
        description: "One public place for the brand, products, and ways to get in touch.",
        href: "/about",
        cta: "About OmniaCreata",
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getHomeCopy(locale);

  return createPageMetadata({
    locale,
    path: "/",
    title: "OmniaCreata",
    description: copy.metadataDescription,
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getHomeCopy(locale);

  return (
    <>
      <section className="home-showcase relative overflow-hidden px-6 pb-8 pt-16 sm:px-8 lg:px-10">
        <div className="home-showcase__glow" />
        <div className="home-showcase__layout relative mx-auto grid max-w-[1340px] gap-12 lg:min-h-[650px] lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="home-showcase__copy">
            <p className="site-kicker">{copy.heroKicker}</p>
            <h1 className="home-wordmark mt-7">OmniaCreata</h1>
            <p className="mt-8 max-w-xl text-[2rem] leading-[1.25] text-foreground-soft sm:text-[2.45rem]">
              {copy.heroLine}
            </p>
            <p className="mt-7 max-w-lg text-base leading-8 text-foreground-soft">
              {copy.heroSupport}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel(locale)}
              </ButtonLink>
              <ButtonLink href={withLocalePrefix(locale, "/products")} size="lg" variant="secondary">
                {copy.ecosystemCta}
              </ButtonLink>
            </div>
          </div>

          <div className="home-hero-art">
            <Image
              alt={copy.heroAlt}
              className="home-hero-art__image"
              fill
              loading="eager"
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
            <p className="site-kicker">{copy.sectionKicker}</p>
            <h2 className="site-title max-w-[12ch]">{copy.sectionTitle}</h2>
            <p className="site-copy">{copy.sectionCopy}</p>
          </div>

          <div className="home-ecosystem-grid">
            {copy.workflowPoints.map((item) => (
              <article className="home-ecosystem-card" key={item.title}>
                <div className="home-ecosystem-card__icon" />
                <div>
                  <h3>{item.title}</h3>
                  <span>{item.label}</span>
                </div>
                <div className="home-ecosystem-card__rule" />
                <p className="home-ecosystem-card__copy">{item.description}</p>
                <ButtonLink
                  className="col-span-full justify-self-start"
                  href={
                    item.title === "Studio"
                      ? studioPrimaryHref(locale)
                      : withLocalePrefix(locale, item.href)
                  }
                  size="md"
                  variant="ghost"
                >
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
