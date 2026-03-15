import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/marketing/page-hero";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";

type TermsOfServicePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: TermsOfServicePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/terms-of-service",
    title: "Terms of Service",
    description:
      "Terms for using omniacreata.com and its related public communication routes.",
  });
}

export default async function TermsOfServicePage({
  params,
}: TermsOfServicePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const isTurkish = locale === "tr";
  const sections = isTurkish
    ? [
        {
          title: "1. Sartlarin kabul edilmesi",
          content:
            "omniacreata.com sitesini kullandiginizda bu sartlari ve ilgili yasal duzenlemeleri kabul etmis olursunuz.",
        },
        {
          title: "2. Public bilgi kapsami",
          content:
            "Bu site; Omnia Creata urunlerini, fiyatlandirma yaklasimini, yasal metinleri ve resmi iletisim yollarini sunar. Ozellikler zamanla degisebilir.",
        },
        {
          title: "3. Kabul edilebilir kullanim",
          content:
            "Siteyi kotuye kullanamaz, sistemi engelleyemez veya yetkisiz erisim denemelerinde bulunamazsiniz.",
        },
        {
          title: "4. Urun erisimi ve gelecekteki hizmetler",
          content:
            "Urun veya platform referanslari her bolgede anlik erisim garantisi vermez. Omnia Creata erisim modelini guncelleyebilir.",
        },
        {
          title: "5. Fikri mulkiyet",
          content:
            "Omnia Creata markasi, logo, tasarim unsurlari ve yazi icerikleri fikri mulkiyet kapsamindadir.",
        },
        {
          title: "6. Garanti yoktur",
          content:
            "Public site oldugu gibi sunulur. Icerikte ileriye donuk ifadeler veya surekli guncellenen bilgiler bulunabilir.",
        },
        {
          title: "7. Sorumlulugun sinirlandirilmasi",
          content:
            "Yururlukteki hukukun izin verdigi olcude, public site kullanimindan dogan zararlardan Omnia Creata sorumlu tutulamaz.",
        },
        {
          title: "8. Iletisim",
          content:
            "Sartlarla ilgili sorularinizi omniacreata.com uzerindeki resmi iletisim kanallarindan iletebilirsiniz.",
        },
      ]
    : [
        {
          title: "1. Acceptance of terms",
          content:
            "By accessing or using omniacreata.com, you agree to these terms and any applicable laws governing the use of the public Omnia Creata website.",
        },
        {
          title: "2. Public information only",
          content:
            "The public site is intended to present Omnia Creata, its flagship products, pricing posture, legal terms, and official contact routes. Availability, features, and access conditions may change over time.",
        },
        {
          title: "3. Acceptable use",
          content:
            "You may not misuse the public site, interfere with its operation, attempt unauthorized access, or use the website in ways that violate law, security, or the rights of others.",
        },
        {
          title: "4. Product access and future services",
          content:
            "References to products, applications, or platform access points do not guarantee immediate availability in every region or on every surface. Omnia Creata may change, suspend, or limit public access paths at its discretion.",
        },
        {
          title: "5. Intellectual property",
          content:
            "The Omnia Creata brand, logo, design elements, written materials, and public software presentation are protected intellectual property and may not be reused without permission.",
        },
        {
          title: "6. No warranty",
          content:
            "The public site is provided on an as-is basis. While Omnia Creata aims for accuracy and quality, the site may contain future-looking statements, placeholder product details, or evolving access information.",
        },
        {
          title: "7. Limitation of liability",
          content:
            "To the maximum extent permitted by law, Omnia Creata will not be liable for damages arising from use of, or inability to use, the public site or related public information.",
        },
        {
          title: "8. Contact",
          content:
            "Questions regarding these terms can be sent through the public contact channels listed on omniacreata.com.",
        },
      ];

  return (
    <>
      <PageHero
        description={
          isTurkish
            ? "Bu sartlar, omniacreata.com public merkezinin ve ilgili erisim kanallarinin kullanim kurallarini belirler."
            : "These terms explain the basic rules for using omniacreata.com and its public contact routes."
        }
        eyebrow={isTurkish ? "Hizmet sartlari" : "Terms of Service"}
        meta={[
          {
            label: isTurkish ? "Kapsam" : "Scope",
            value: isTurkish ? "Public site ve talepler" : "Public website and inquiries",
          },
          { label: isTurkish ? "Alan adi" : "Domain", value: "omniacreata.com" },
          {
            label: isTurkish ? "Yururluk tarihi" : "Effective date",
            value: isTurkish ? "14 Mart 2026" : "March 14, 2026",
          },
        ]}
        title={
          isTurkish
            ? "Omnia Creata public web sitesi kullanim sartlari."
            : "Terms for using the Omnia Creata public website."
        }
        locale={locale}
      />

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <article className="legal-copy luxury-panel mx-auto max-w-5xl rounded-[32px] p-7 sm:p-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.content}</p>
            </div>
          ))}
        </article>
      </section>
    </>
  );
}
