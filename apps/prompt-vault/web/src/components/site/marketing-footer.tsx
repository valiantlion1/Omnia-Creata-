import { brand } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import Link from "next/link";
import { BrandMark } from "@/components/shared/brand-mark";
import { localizeHref } from "@/lib/locale";
import { translate } from "@prompt-vault/i18n";

export async function MarketingFooter({ locale }: { locale: Locale }) {
  const appHref = localizeHref(locale, "/app");

  return (
    <footer className="border-t border-[var(--border)] bg-[color:rgba(255,255,255,0.28)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <div className="space-y-4">
          <BrandMark />
          <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            {translate(locale, "marketing.footerDescription")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm text-[var(--text-secondary)]">
          <div className="space-y-3">
            <div className="font-semibold text-[var(--text-primary)]">
              {translate(locale, "common.productName")}
            </div>
            <Link href={localizeHref(locale, "/sign-in")}>{translate(locale, "common.signIn")}</Link>
            <Link href={localizeHref(locale, "/sign-up")}>{translate(locale, "common.signUp")}</Link>
            <Link href={appHref}>{translate(locale, "common.launchApp")}</Link>
            <Link href={localizeHref(locale, "/help")}>{translate(locale, "common.help")}</Link>
          </div>
          <div className="space-y-3">
            <div className="font-semibold text-[var(--text-primary)]">
              {locale === "tr" ? "Yasal" : "Legal"}
            </div>
            <Link href={localizeHref(locale, "/privacy")}>
              {locale === "tr" ? "Gizlilik" : "Privacy"}
            </Link>
            <Link href={localizeHref(locale, "/terms")}>
              {locale === "tr" ? "Kosullar" : "Terms"}
            </Link>
            <Link href={localizeHref(locale, "/faq")}>{translate(locale, "common.faq")}</Link>
            <a href={brand.productUrl} rel="noreferrer" target="_blank">
              {translate(locale, "marketing.footerProductLink")}
            </a>
            <a href={brand.marketingUrl} rel="noreferrer" target="_blank">
              {translate(locale, "marketing.footerMainSiteLink")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
