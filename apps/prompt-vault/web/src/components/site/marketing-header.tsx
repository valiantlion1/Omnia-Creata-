import { brand } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import Link from "next/link";
import { BrandMark } from "@/components/shared/brand-mark";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Button } from "@/components/ui/primitives";
import { localizeHref } from "@/lib/locale";
import { translate } from "@prompt-vault/i18n";

export async function MarketingHeader({ locale }: { locale: Locale }) {
  const appHref = localizeHref(locale, "/app");

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`} className="shrink-0">
            <BrandMark compact />
          </Link>
          <a
            className="hidden text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:inline-flex"
            href={brand.marketingUrl}
            rel="noreferrer"
            target="_blank"
          >
            {translate(locale, "common.parentBrand")}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          <Link href={localizeHref(locale, "/sign-in")} className="hidden md:block">
            <Button variant="ghost">{translate(locale, "common.signIn")}</Button>
          </Link>
          <Link href={localizeHref(locale, "/sign-up")} className="hidden md:block">
            <Button variant="secondary">{translate(locale, "common.signUp")}</Button>
          </Link>
          <Link href={appHref}>
            <Button>{translate(locale, "common.launchApp")}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
