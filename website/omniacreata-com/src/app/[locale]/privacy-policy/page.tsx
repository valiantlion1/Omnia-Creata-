import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { isLocale } from "@/i18n/config";
import { contactChannels } from "@/lib/contact-channels";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

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
      "Privacy policy for omniacreata.com and its contact forms.",
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
            "OmniaCreata, website uzerinden toplanan kisisel veriyi satmaz. Yasal zorunluluk, guvenlik veya hizmet operasyonu gerektiginde sinirli paylasim yapilabilir.",
        },
        {
          title: "6. Veri saklama",
          content:
            "Veriler, talep yonetimi, yasal yukumluluk ve urun destek ihtiyaci devam ettigi surece tutulur.",
        },
        {
          title: "7. Kullanici talepleri",
          content:
            `Erisim, duzeltme veya silme talepleri icin ${contactChannels.legal} adresi uzerinden bize ulasabilirsiniz.`,
        },
      ]
    : [
        {
          title: "1. Information we collect",
          content:
            "We may collect information that you submit directly through contact forms or email conversations on omniacreata.com. This can include your name, email address, company name, request type, and message content.",
        },
        {
          title: "2. How we use information",
          content:
            "Submitted information is used to respond to inquiries, coordinate support, improve the website and product experience, and maintain quality and security.",
        },
        {
          title: "3. Contact submissions",
          content:
            "Contact submissions are processed only as needed to review and respond to your request.",
        },
        {
          title: "4. Cookies and preferences",
          content:
            "The website may store a locale preference cookie so your language and region selection can persist across visits. Additional cookies may be added later for security, performance, or analytics purposes.",
        },
        {
          title: "5. Sharing and disclosure",
          content:
            "OmniaCreata does not sell personal information submitted through the website. Information may be disclosed only when required for service operation, legal compliance, security response, or legitimate business processing.",
        },
        {
          title: "6. Data retention",
          content:
            "We retain submitted data only as long as needed for inquiry handling, business records, security review, legal obligations, or product support operations.",
        },
        {
          title: "7. Your requests",
          content:
            `If you have privacy questions or want to request access, correction, or deletion where applicable, contact ${contactChannels.legal}.`,
        },
      ];

  return (
    <LegalDocumentPage
      actions={[
        {
          href: withLocalePrefix(locale, "/contact"),
          label: isTurkish ? "Iletisim" : "Contact",
        },
        {
          href: withLocalePrefix(locale, "/terms-of-service"),
          label: isTurkish ? "Sartlari gor" : "View terms",
          variant: "secondary",
        },
      ]}
      description={
        isTurkish
          ? "Bu sayfa omniacreata.com uzerindeki iletisim talepleri, cerezler ve temel veri islemleri icin gecerli gizlilik kurallarini aciklar."
          : "This page explains how omniacreata.com handles contact submissions, cookies, and basic data practices."
      }
      documentDescription={
        isTurkish
          ? `Temel basliklari tarayip ilgili konuda bize dogrudan ${contactChannels.legal} uzerinden ulasabilirsiniz.`
          : "Review the sections below for the main privacy commitments and contact us directly if you need a specific answer."
      }
      documentEyebrow={isTurkish ? "Belge" : "Document"}
      documentTitle={
        isTurkish ? "Bu politika neleri kapsiyor?" : "What this policy covers"
      }
      eyebrow={isTurkish ? "Gizlilik politikasi" : "Privacy Policy"}
      footerDescription={
        isTurkish
          ? "Daha spesifik bir talebiniz varsa bizimle iletisime gecebilir veya kullanim kosullarini da inceleyebilirsiniz."
          : "If you need a more specific answer, contact us directly or review the related public terms as well."
      }
      footerEyebrow={isTurkish ? "Ilgili sayfa" : "Related page"}
      footerTitle={
        isTurkish
          ? "Gizlilik sorulari icin dogrudan iletisim kurabilirsiniz."
          : "You can reach us directly for privacy-specific questions."
      }
      meta={[
        {
          label: isTurkish ? "Kapsam" : "Scope",
          value: isTurkish ? "Website" : "Website",
        },
        { label: isTurkish ? "Alan adi" : "Domain", value: "omniacreata.com" },
        {
          label: isTurkish ? "Yururluk tarihi" : "Effective date",
          value: isTurkish ? "14 Mart 2026" : "March 14, 2026",
        },
      ]}
      sections={sections}
      summary={
        isTurkish
          ? "Bu politika, sitede toplanan bilgilerin hangi amacla kullanildigini, nasil saklandigini ve hangi durumlarda paylasilabilecegini sade bicimde ozetler."
          : "This policy gives a clear overview of what the website collects, why it is used, how long it is kept, and when it may be disclosed."
      }
      summaryTitle={isTurkish ? "Kisa ozet" : "Quick summary"}
      title={
        isTurkish
          ? "Gizlilik Politikasi"
          : "Privacy Policy"
      }
    />
  );
}
