import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type RefundPolicyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: RefundPolicyPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/refund-policy",
    title: "Refund Policy",
    description:
      "Refund policy for OmniaCreata Studio subscriptions and credit purchases.",
  });
}

export default async function RefundPolicyPage({ params }: RefundPolicyPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const isTurkish = locale === "tr";
  const sections = isTurkish
    ? [
        {
          title: "1. Kapsam",
          content:
            "Bu politika OmniaCreata Studio abonelikleri ve kredi paketleri icin gecerli iade kurallarini aciklar.",
        },
        {
          title: "2. Abonelik iptalleri",
          content:
            "Aylik aboneliginizi istediginiz zaman iptal edebilirsiniz. Iptal, mevcut donemin sonundaki yenilemeyi durdurur.",
        },
        {
          title: "3. Iade talepleri",
          content:
            "Yanlis odeme, teknik erisim sorunu veya benzer bir durum varsa odemeden sonraki 14 gun icinde founder@omniacreata.com adresinden iade talebi gonderebilirsiniz.",
        },
        {
          title: "4. Kullanilmis krediler",
          content:
            "Uretilmis ciktılar veya harcanmis krediler genel olarak iade edilmez. Ancak yasal zorunluluklar veya dogrulanabilir teknik hata durumlari ayrica degerlendirilir.",
        },
        {
          title: "5. Kredi paketleri",
          content:
            "Kredi paketleri tek seferlik dijital top-up olarak sunulur. Kullanim baslamadan onceki uygun talepler incelenebilir.",
        },
        {
          title: "6. Nasil basvurulur",
          content:
            "Iade talebi icin hesap e-postanizi, odeme tarihini, islem bilgisini ve talep nedeninizi founder@omniacreata.com adresine iletin.",
        },
      ]
    : [
        {
          title: "1. Scope",
          content:
            "This policy explains how refund requests are handled for OmniaCreata Studio subscriptions and credit pack purchases.",
        },
        {
          title: "2. Subscription cancellations",
          content:
            "You may cancel a monthly subscription at any time. Cancellation stops the next renewal and does not remove access already provided for the active billing period.",
        },
        {
          title: "3. Refund requests",
          content:
            "If you believe a payment was made in error, access failed, or a technical issue prevented use, contact founder@omniacreata.com within 14 days of purchase.",
        },
        {
          title: "4. Used credits",
          content:
            "Generated outputs and consumed credits are generally not refundable. We may review verified technical failures or legally required refund cases separately.",
        },
        {
          title: "5. Credit packs",
          content:
            "Credit packs are one-time digital top-ups. Eligible unused credit-pack requests may be reviewed before credits are consumed.",
        },
        {
          title: "6. How to request support",
          content:
            "Send the account email, payment date, transaction details, and reason for the request to founder@omniacreata.com.",
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
          href: withLocalePrefix(locale, "/pricing"),
          label: isTurkish ? "Fiyatlari gor" : "View pricing",
          variant: "secondary",
        },
      ]}
      description={
        isTurkish
          ? "Bu sayfa OmniaCreata Studio abonelikleri ve kredi paketleri icin iade surecini aciklar."
          : "This page explains the refund process for OmniaCreata Studio subscriptions and credit packs."
      }
      documentDescription={
        isTurkish
          ? "Iade talepleri, dijital urun kullanimi ve teknik erisim sorunlari icin temel kurallari asagida bulabilirsiniz."
          : "Review the sections below for subscription cancellation, digital credit usage, and technical access cases."
      }
      documentEyebrow={isTurkish ? "Belge" : "Document"}
      documentTitle={isTurkish ? "Iade kurallari" : "Refund rules"}
      eyebrow={isTurkish ? "Iade politikasi" : "Refund Policy"}
      footerDescription={
        isTurkish
          ? "Hesap ve odeme bilgilerinizi ekleyerek founder@omniacreata.com adresinden bize ulasabilirsiniz."
          : "Include your account and payment details when contacting founder@omniacreata.com."
      }
      footerEyebrow={isTurkish ? "Destek" : "Support"}
      footerTitle={
        isTurkish
          ? "Iade talebini yazili olarak iletin."
          : "Send refund requests in writing."
      }
      meta={[
        {
          label: isTurkish ? "Kapsam" : "Scope",
          value: isTurkish ? "Studio odemeleri" : "Studio payments",
        },
        { label: isTurkish ? "Alan adi" : "Domain", value: "omniacreata.com" },
        {
          label: isTurkish ? "Yururluk tarihi" : "Effective date",
          value: isTurkish ? "27 Nisan 2026" : "April 27, 2026",
        },
      ]}
      sections={sections}
      summary={
        isTurkish
          ? "Abonelikler iptal edilebilir; iade talepleri odeme, erisim ve kullanilmis kredi durumuna gore incelenir."
          : "Subscriptions can be canceled; refund requests are reviewed based on payment timing, access state, and credit usage."
      }
      summaryTitle={isTurkish ? "Kisa ozet" : "Quick summary"}
      title={isTurkish ? "Iade Politikasi" : "Refund Policy"}
    />
  );
}
