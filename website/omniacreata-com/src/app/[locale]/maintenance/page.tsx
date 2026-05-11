import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SocialLinks } from "@/components/social/social-links";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";

type MaintenancePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function getMaintenanceCopy(locale: string) {
  if (locale === "tr") {
    return {
      metadataTitle: "Bakim",
      metadataDescription: "OmniaCreata kisa bir bakim penceresinde.",
      kicker: "Bakim modu",
      title: "Kisa bir ayar yapiyoruz.",
      copy:
        "OmniaCreata su anda kisa bir bakim penceresinde. Public site geri geldiginde Studio ve urun sayfalari normal akisa donecek.",
      email: "E-posta gonder",
      updates: "Guncellemeleri gor",
      statusKicker: "Durum",
      statusTitle: "Planli bakim",
      statusCopy:
        "Bu ekran site yayindayken gecici olarak acilabilir. Uygulama veya domain degisikligi gerektirmez.",
      socialKicker: "Guncellemeler",
      socialTitle: "Resmi kanallar",
      socialCopy:
        "Bakim sirasinda da resmi Instagram ve X hesaplarindan guncelleme takip edebilirsin.",
      standby: "Hazir bekliyor",
      visualItems: ["Public site", "Studio", "Iletisim"],
      visualAlt: "OmniaCreata bakim modu gorseli",
    };
  }

  return {
    metadataTitle: "Maintenance",
    metadataDescription: "OmniaCreata is in a short maintenance window.",
    kicker: "Maintenance mode",
    title: "A short adjustment is underway.",
    copy:
      "OmniaCreata is in a short maintenance window. When the public site returns, Studio and product pages will go back to the normal flow.",
    email: "Email us",
    updates: "Follow updates",
    statusKicker: "Status",
    statusTitle: "Planned maintenance",
    statusCopy:
      "This page can be enabled temporarily while the site stays live. It does not require a domain or deployment change.",
    socialKicker: "Updates",
    socialTitle: "Official channels",
    socialCopy:
      "During maintenance, you can still follow official updates on Instagram and X.",
    standby: "Standing by",
    visualItems: ["Public site", "Studio", "Contact"],
    visualAlt: "OmniaCreata maintenance mode visual",
  };
}

export async function generateMetadata({
  params,
}: MaintenancePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getMaintenanceCopy(locale);

  return {
    ...createPageMetadata({
      locale,
      path: "/maintenance",
      title: copy.metadataTitle,
      description: copy.metadataDescription,
    }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function MaintenancePage({ params }: MaintenancePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getMaintenanceCopy(locale);

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="grid gap-10 lg:min-h-[620px] lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="space-y-6">
            <p className="site-kicker">{copy.kicker}</p>
            <h1 className="site-title max-w-[10ch]">{copy.title}</h1>
            <p className="site-copy">{copy.copy}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="mailto:hello@omniacreata.com" size="lg" variant="primary">
                {copy.email}
              </ButtonLink>
              <ButtonLink href="#updates" size="lg" variant="secondary">
                {copy.updates}
              </ButtonLink>
            </div>
          </div>

          <div className="relative min-h-[28rem] overflow-hidden rounded-[34px] border border-white/[0.08] bg-[rgba(255,255,255,0.03)] shadow-[0_34px_120px_rgba(0,0,0,0.34)]">
            <Image
              alt={copy.visualAlt}
              className="object-cover opacity-[0.72]"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              src="/images/omnia-home-hero-art-v1.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,14,13,0.86),rgba(13,14,13,0.24)_48%,rgba(13,14,13,0.72))]" />
            <div className="absolute inset-x-6 bottom-6 grid gap-3 sm:grid-cols-3">
              {copy.visualItems.map((item) => (
                <div
                  className="rounded-[20px] border border-white/10 bg-black/30 p-4 backdrop-blur-md"
                  key={item}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                    {item}
                  </span>
                  <p className="mt-2 text-sm text-foreground-soft">{copy.standby}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]"
          id="updates"
        >
          <div className="space-y-4">
            <p className="site-kicker">{copy.statusKicker}</p>
            <h2 className="site-title max-w-[10ch]">{copy.statusTitle}</h2>
            <p className="site-copy">{copy.statusCopy}</p>
          </div>

          <div className="space-y-5">
            <p className="site-kicker">{copy.socialKicker}</p>
            <h3 className="text-2xl font-semibold text-foreground">{copy.socialTitle}</h3>
            <p className="site-copy">{copy.socialCopy}</p>
            <SocialLinks locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
