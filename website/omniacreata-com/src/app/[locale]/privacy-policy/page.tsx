import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/marketing/page-hero";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";

type PrivacyPolicyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: PrivacyPolicyPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "Privacy policy for omniacreata.com and its public contact flows.",
  });
}

export default async function PrivacyPolicyPage({
  params,
}: PrivacyPolicyPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const isTurkish = locale === "tr";
  const sections = isTurkish
    ? [
        {
          title: "1. Toplanan bilgiler",
          content:
            "Iletisim formlari, e-posta yazismalari veya destek kanallari uzerinden paylastiginiz ad, e-posta, sirket ve mesaj bilgileri toplanabilir.",
        },
        {
          title: "2. Bilgilerin kullanim amaci",
          content:
            "Toplanan bilgiler talepleri yanitlamak, urun uygunlugunu degerlendirmek, destek surecini yonetmek ve ekosistem guvenligini korumak icin kullanilir.",
        },
        {
          title: "3. Iletisim formu islemleri",
          content:
            "Form verileri talebinizi yanitlamak ve destek surecini yonetmek icin islenebilir.",
        },
        {
          title: "4. Cerezler ve tercihler",
          content:
            "Dil ve bolge seciminizi korumak icin locale cerezleri kullanilabilir. Ilerleyen fazlarda guvenlik ve performans cerezleri eklenebilir.",
        },
        {
          title: "5. Paylasim ve ifsa",
          content:
            "Omnia Creata, public siteden toplanan kisisel veriyi satmaz. Yasal zorunluluk, guvenlik veya hizmet operasyonu gerektiginde sinirli paylasim yapilabilir.",
        },
        {
          title: "6. Veri saklama",
          content:
            "Veriler, talep yonetimi, yasal yukumluluk ve urun destek ihtiyaci devam ettigi surece tutulur.",
        },
        {
          title: "7. Kullanici talepleri",
          content:
            "Erisim, duzeltme veya silme talepleri icin privacy@omniacreata.com adresi uzerinden bize ulasabilirsiniz.",
        },
      ]
    : [
        {
          title: "1. Information we collect",
          content:
            "We may collect information that you submit directly through contact forms, email conversations, or future support routes on omniacreata.com. This can include your name, email address, company name, request type, and message content.",
        },
        {
          title: "2. How we use information",
          content:
            "Submitted information is used to respond to inquiries, evaluate platform fit, coordinate support, improve the public product experience, and maintain the quality and security of the Omnia Creata ecosystem.",
        },
        {
          title: "3. Contact submissions",
          content:
            "Contact submissions are processed only as needed to review and respond to your request.",
        },
        {
          title: "4. Cookies and preferences",
          content:
            "The public site may store a locale preference cookie so your language and region selection can persist across visits. Additional cookies may be added in the future for security, performance, or analytics purposes.",
        },
        {
          title: "5. Sharing and disclosure",
          content:
            "Omnia Creata does not sell personal information submitted through the public site. Information may be disclosed only when required for service operation, legal compliance, security response, or legitimate business processing.",
        },
        {
          title: "6. Data retention",
          content:
            "We retain submitted data only as long as needed for inquiry handling, business records, security review, legal obligations, or product support operations.",
        },
        {
          title: "7. Your requests",
          content:
            "If you have privacy questions or want to request access, correction, or deletion where applicable, contact privacy@omniacreata.com.",
        },
      ];

  return (
    <>
      <PageHero
        description={
          isTurkish
            ? "Bu gizlilik politikasi, omniacreata.com public sitesinde iletisim taleplerinin, veri yonetiminin ve yasal sureclerin nasil ele alindigini aciklar."
            : "This page explains how omniacreata.com handles contact submissions, cookies, and basic data management."
        }
        eyebrow={isTurkish ? "Gizlilik politikasi" : "Privacy Policy"}
        meta={[
          {
            label: isTurkish ? "Kapsam" : "Scope",
            value: isTurkish ? "Public web sitesi" : "Public website",
          },
          { label: isTurkish ? "Alan adi" : "Domain", value: "omniacreata.com" },
          {
            label: isTurkish ? "Yururluk tarihi" : "Effective date",
            value: isTurkish ? "14 Mart 2026" : "March 14, 2026",
          },
        ]}
        title={
          isTurkish
            ? "Omnia Creata public sitesi gizlilik taahhutleri."
            : "Privacy commitments for the Omnia Creata public site."
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
