import Link from "next/link";
import type { Dictionary } from "@omnia-watch/i18n";
import type { Locale } from "@omnia-watch/types";
import { Badge } from "@omnia-watch/ui";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LinkButton } from "@/components/link-button";
import { localizePath } from "@/lib/site";

export function MarketingHeader({
  dictionary,
  locale
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const nav = dictionary.nav.marketing;

  return (
    <header className="sticky top-0 z-40 border-b border-line/50 bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href={localizePath(locale)} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 font-display text-lg font-semibold text-accent">
              OW
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted">
                {dictionary.common.brandName}
              </p>
              <p className="font-display text-xl font-semibold text-text">
                {dictionary.common.productName}
              </p>
            </div>
          </Link>
          <Badge className="hidden lg:inline-flex">{dictionary.common.marketingDomain}</Badge>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted lg:flex">
          <Link href={localizePath(locale, "/features")}>{nav.features}</Link>
          <Link href={localizePath(locale, "/pricing")}>{nav.pricing}</Link>
          <Link href={localizePath(locale, "/security")}>{nav.security}</Link>
          <Link href={localizePath(locale, "/download")}>{nav.download}</Link>
          <Link href={localizePath(locale, "/faq")}>{nav.faq}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher
            currentLocale={locale}
            label={locale === "en" ? dictionary.languages.tr : dictionary.languages.en}
          />
          <LinkButton href={localizePath(locale, "/sign-in")} size="sm" variant="ghost">
            {nav.signIn}
          </LinkButton>
          <LinkButton href={localizePath(locale, "/sign-up")} size="sm" variant="primary">
            {nav.signUp}
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
