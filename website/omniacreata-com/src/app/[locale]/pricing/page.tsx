import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { formatCredits, formatUsd, studioPricing } from "@/content/pricing";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { studioAccessHref, studioAccessLabel, withLocalePrefix } from "@/lib/utils";

type PricingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function getPricingCopy(locale: string) {
  if (locale === "tr") {
    return {
      metadataTitle: "Fiyatlandirma",
      metadataDescription: "Studio fiyatlandirma ve erisim bilgileri.",
      kicker: "Fiyatlandirma",
      title: "Studio fiyatlandirmasi.",
      intro:
        "OmniaCreata Studio, yapay zeka destekli gorsel uretim icin ucretli bir yaratici calisma alanidir. Public odeme akisi erisim acildiginda resmi billing akisindan baslar.",
      creditPacksKicker: "Kredi paketleri",
      creditPacksCopy:
        "Kredi paketleri, ek Studio gorsel uretimi icin tek seferlik yuklemelerdir.",
      billingKicker: "Odeme notlari",
      billingCopy:
        "Fiyatlar USD uzerinden listelenir. Vergiler uygulanabilir. Abonelikler iptal edilene kadar aylik yenilenir. Satin almadan once hizmet sartlari, gizlilik politikasi ve iade politikasini inceleyin.",
      seeStudio: "Studio'yu gor",
      plans: [
        {
          name: "Ucretsiz Hesap",
          price: formatUsd(studioPricing.plans.free.priceUsd),
          cadence: "Hesap erisimi",
          description:
            "Studio'yu kesfet, hesabini yonet ve odeme acildiginda cuzdan kredisi al.",
          points: [
            "Dahil gorsel kredisi yok",
            "Create odakli erisim yolu",
            "Cuzdan kredi paketleri desteklenir",
          ],
        },
        {
          name: "Creator",
          price: formatUsd(studioPricing.plans.creator.priceUsd),
          cadence: "aylik",
          description: "Duzenli gorsel uretim icin odakli ucretli plan.",
          points: [
            `${formatCredits(studioPricing.plans.creator.monthlyCredits)} aylik kredi`,
            "Studio Create erisimi",
            "Ticari hesap destegi",
          ],
        },
        {
          name: "Pro",
          price: formatUsd(studioPricing.plans.pro.priceUsd),
          cadence: "aylik",
          description: "Daha yogun Studio kullanimi icin daha fazla aylik alan.",
          points: [
            `${formatCredits(studioPricing.plans.pro.monthlyCredits)} aylik kredi`,
            "Daha yuksek kredi hakki",
            "Tekrarlanan production isleri icin",
          ],
        },
      ],
      creditPacks: [
        {
          name: `Kredi paketi ${formatCredits(studioPricing.creditPacks.small.credits)}`,
          price: formatUsd(studioPricing.creditPacks.small.priceUsd),
          description: "Ara sira ek render icin daha kucuk yukleme.",
        },
        {
          name: `Kredi paketi ${formatCredits(studioPricing.creditPacks.large.credits)}`,
          price: formatUsd(studioPricing.creditPacks.large.priceUsd),
          description: "Daha yogun gorsel uretim patlamalari icin buyuk yukleme.",
        },
      ],
      legalLinksLabel: "Fatura ve politika baglantilari",
      terms: "Hizmet Sartlari",
      privacy: "Gizlilik Politikasi",
      refund: "Iade Politikasi",
    };
  }

  return {
    metadataTitle: "Pricing",
    metadataDescription: "Pricing and access information for Studio.",
    kicker: "Pricing",
    title: "Studio pricing.",
    intro:
      "OmniaCreata Studio is a paid creative workspace for AI-assisted visual production. Public checkout opens through the official billing flow when access is available.",
    creditPacksKicker: "Credit packs",
    creditPacksCopy:
      "Credit packs are one-time top-ups for additional Studio image generation.",
    billingKicker: "Billing notes",
    billingCopy:
      "Prices are listed in USD. Taxes may apply. Subscriptions renew monthly until canceled. See the terms, privacy policy, and refund policy before purchase.",
    seeStudio: "See Studio",
    plans: [
      {
        name: "Free Account",
        price: formatUsd(studioPricing.plans.free.priceUsd),
        cadence: "Account access",
        description:
          "Explore Studio, manage your account, and buy wallet credits when checkout is available.",
        points: ["No bundled image credits", "Create-first access path", "Wallet credit packs supported"],
      },
      {
        name: "Creator",
        price: formatUsd(studioPricing.plans.creator.priceUsd),
        cadence: "per month",
        description: "A focused paid plan for regular creative image work.",
        points: [
          `${formatCredits(studioPricing.plans.creator.monthlyCredits)} monthly credits`,
          "Studio Create access",
          "Commercial account support",
        ],
      },
      {
        name: "Pro",
        price: formatUsd(studioPricing.plans.pro.priceUsd),
        cadence: "per month",
        description: "More monthly room for heavier Studio usage.",
        points: [
          `${formatCredits(studioPricing.plans.pro.monthlyCredits)} monthly credits`,
          "Higher credit allowance",
          "Built for repeated production work",
        ],
      },
    ],
    creditPacks: [
      {
        name: `Credit pack ${formatCredits(studioPricing.creditPacks.small.credits)}`,
        price: formatUsd(studioPricing.creditPacks.small.priceUsd),
        description: "A smaller top-up for occasional extra renders.",
      },
      {
        name: `Credit pack ${formatCredits(studioPricing.creditPacks.large.credits)}`,
        price: formatUsd(studioPricing.creditPacks.large.priceUsd),
        description: "A larger top-up for heavier bursts of image generation.",
      },
    ],
    legalLinksLabel: "Billing policy links",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    refund: "Refund Policy",
  };
}

export async function generateMetadata({
  params,
}: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getPricingCopy(locale);

  return createPageMetadata({
    locale,
    path: "/pricing",
    title: copy.metadataTitle,
    description: copy.metadataDescription,
  });
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getPricingCopy(locale);

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="max-w-[860px] space-y-5">
          <p className="site-kicker">{copy.kicker}</p>
          <h1 className="site-title max-w-[12ch]">{copy.title}</h1>
          <p className="site-copy">{copy.intro}</p>
        </div>

        <div className="site-rule mt-12 grid gap-5 pt-8 lg:grid-cols-3">
          {copy.plans.map((plan) => (
            <article
              className="rounded-[28px] border border-[rgba(216,181,109,0.14)] bg-[rgba(255,255,255,0.035)] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)]"
              key={plan.name}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
                {plan.name}
              </p>
              <div className="mt-5 flex items-end gap-2">
                <strong className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
                  {plan.price}
                </strong>
                <span className="pb-1 text-sm text-muted">{plan.cadence}</span>
              </div>
              <p className="mt-5 text-sm leading-7 text-foreground-soft">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground-soft">
                {plan.points.map((point) => (
                  <li className="border-t border-white/[0.08] pt-3" key={point}>
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="site-kicker">{copy.creditPacksKicker}</p>
            <p className="site-copy mt-4">{copy.creditPacksCopy}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {copy.creditPacks.map((pack) => (
              <article
                className="rounded-[24px] border border-[rgba(216,181,109,0.12)] bg-[rgba(255,255,255,0.03)] p-5"
                key={pack.name}
              >
                <strong className="text-lg text-foreground">{pack.name}</strong>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {pack.price}
                </p>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">{pack.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">{copy.billingKicker}</p>
            <p className="site-copy mt-4">{copy.billingCopy}</p>
            <nav
              aria-label={copy.legalLinksLabel}
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground-soft"
            >
              <Link
                className="transition hover:text-foreground"
                href={withLocalePrefix(locale, "/terms-of-service") as Route}
              >
                {copy.terms}
              </Link>
              <Link
                className="transition hover:text-foreground"
                href={withLocalePrefix(locale, "/privacy-policy") as Route}
              >
                {copy.privacy}
              </Link>
              <Link
                className="transition hover:text-foreground"
                href={withLocalePrefix(locale, "/refund-policy") as Route}
              >
                {copy.refund}
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
              {copy.seeStudio}
            </ButtonLink>
            <ButtonLink href={studioAccessHref(locale)} size="lg" variant="primary">
              {studioAccessLabel(locale)}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
