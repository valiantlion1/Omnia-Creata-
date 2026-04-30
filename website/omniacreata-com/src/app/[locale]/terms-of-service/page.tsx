import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

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
      "Terms for using omniacreata.com and its official contact channels.",
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
            "Bu site; OmniaCreata urunlerini, fiyatlandirma bilgisini, yasal metinleri ve resmi iletisim yollarini sunar. Ozellikler zamanla degisebilir.",
        },
        {
          title: "3. Kabul edilebilir kullanim",
          content:
            "Siteyi kotuye kullanamaz, sistemi engelleyemez veya yetkisiz erisim denemelerinde bulunamazsiniz.",
        },
        {
          title: "4. Urun erisimi ve gelecekteki hizmetler",
          content:
            "Urun veya platform referanslari her bolgede anlik erisim garantisi vermez. OmniaCreata erisim modelini guncelleyebilir.",
        },
        {
          title: "5. Fikri mulkiyet",
          content:
            "OmniaCreata markasi, logo, tasarim unsurlari ve yazi icerikleri fikri mulkiyet kapsamindadir.",
        },
        {
          title: "6. Garanti yoktur",
          content:
            "Website oldugu gibi sunulur. Icerikte zamanla degisebilecek bilgiler bulunabilir.",
        },
        {
          title: "7. Sorumlulugun sinirlandirilmasi",
          content:
            "Yururlukteki hukukun izin verdigi olcude, website kullanimindan dogan zararlardan OmniaCreata sorumlu tutulamaz.",
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
            "By accessing or using omniacreata.com, you agree to these terms and any applicable laws governing use of the website.",
        },
        {
          title: "2. Website information",
          content:
            "This website is intended to present OmniaCreata, its products, pricing information, legal terms, and official contact channels. Availability, features, and access conditions may change over time.",
        },
        {
          title: "3. Acceptable use",
          content:
            "You may not misuse the website, interfere with its operation, attempt unauthorized access, or use it in ways that violate law, security, or the rights of others.",
        },
        {
          title: "4. Product access and future services",
          content:
            "References to products, applications, or platform access points do not guarantee immediate availability in every region or on every surface. OmniaCreata may change, suspend, or limit public access paths at its discretion.",
        },
        {
          title: "5. Intellectual property",
          content:
            "The OmniaCreata brand, logo, design elements, written materials, and public software presentation are protected intellectual property and may not be reused without permission.",
        },
        {
          title: "6. No warranty",
          content:
            "The website is provided on an as-is basis. While OmniaCreata aims for accuracy and quality, some details may change as the products and services evolve.",
        },
        {
          title: "7. Limitation of liability",
          content:
            "To the maximum extent permitted by law, OmniaCreata will not be liable for damages arising from use of, or inability to use, the website or related information.",
        },
        {
          title: "8. Contact",
          content:
            "Questions regarding these terms can be sent through the public contact channels listed on omniacreata.com.",
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
          href: withLocalePrefix(locale, "/privacy-policy"),
          label: isTurkish ? "Gizliligi gor" : "View privacy",
          variant: "secondary",
        },
      ]}
      description={
        isTurkish
          ? "Bu sayfa omniacreata.com ve resmi iletisim kanallarini kullanirken gecerli olan temel kosullari aciklar."
          : "This page explains the core rules for using omniacreata.com and its official contact channels."
      }
      documentDescription={
        isTurkish
          ? "Belgenin temel basliklarini asagida okuyabilir, daha spesifik bir durumda resmi iletisim yolunu kullanabilirsiniz."
          : "Read the main sections below for the website usage rules, then contact us if a specific case needs clarification."
      }
      documentEyebrow={isTurkish ? "Belge" : "Document"}
      documentTitle={
        isTurkish ? "Bu sartlar neleri duzenliyor?" : "What these terms cover"
      }
      eyebrow={isTurkish ? "Hizmet sartlari" : "Terms of Service"}
      footerDescription={
        isTurkish
          ? "Daha net bir cevap gerekiyorsa bizimle iletisime gecebilir veya privacy politikasini da birlikte inceleyebilirsiniz."
          : "If you need a more specific answer, contact us directly or review the related privacy commitments as well."
      }
      footerEyebrow={isTurkish ? "Ilgili sayfa" : "Related page"}
      footerTitle={
        isTurkish
          ? "Kullanim kosullariyla ilgili sorular icin dogrudan bize ulasabilirsiniz."
          : "You can reach us directly for terms-related questions."
      }
      meta={[
        {
          label: isTurkish ? "Kapsam" : "Scope",
          value: isTurkish ? "Website ve talepler" : "Website and inquiries",
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
          ? "Bu belge, sitenin ne icin kullanildigini ve hangi kullanimlarin kabul edilmedigini aciklar."
          : "This document outlines what the website is for and what kinds of use are not allowed."
      }
      summaryTitle={isTurkish ? "Kisa ozet" : "Quick summary"}
      title={
        isTurkish
          ? "Hizmet Sartlari"
          : "Terms of Service"
      }
    />
  );
}
