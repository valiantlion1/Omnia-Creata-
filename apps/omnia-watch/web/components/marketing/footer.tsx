import Link from "next/link";
import type { Dictionary } from "@omnia-watch/i18n";
import type { Locale } from "@omnia-watch/types";
import { localizePath } from "@/lib/site";

export function MarketingFooter({
  dictionary,
  locale
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  return (
    <footer className="border-t border-line/50 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <p className="font-display text-2xl font-semibold text-text">
            {dictionary.common.productName}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            A flagship Omnia Creata utility platform for honest PC care, software intelligence,
            and long-term device trust.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-muted">
          <Link href={localizePath(locale, "/features")}>{dictionary.nav.marketing.features}</Link>
          <Link href={localizePath(locale, "/pricing")}>{dictionary.nav.marketing.pricing}</Link>
          <Link href={localizePath(locale, "/download")}>{dictionary.nav.marketing.download}</Link>
          <Link href={localizePath(locale, "/legal/privacy")}>{dictionary.legal.privacy.title}</Link>
          <Link href={localizePath(locale, "/legal/terms")}>{dictionary.legal.terms.title}</Link>
        </div>
      </div>
    </footer>
  );
}
