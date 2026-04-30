import type { Route } from "next";
import Link from "next/link";
import { defaultLocale, type LocaleCode } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import { studioPageHref, withLocalePrefix } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

type FooterProps = {
  locale: LocaleCode;
  messages?: Messages;
};

export function Footer({ locale, messages }: FooterProps) {
  const copy = messages?.nav && messages?.common ? messages : getMessages(defaultLocale);

  return (
    <footer className="px-6 pb-10 pt-14 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px] border-t border-white/[0.09] pt-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_repeat(2,minmax(0,0.9fr))]">
          <div className="space-y-5">
            <BrandMark locale={locale} />
            <p className="max-w-md text-sm leading-7 text-foreground-soft">
              Creative software for image work. Studio is the first product path.
            </p>
          </div>

          <FooterColumn title="Navigate">
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={studioPageHref(locale) as Route}
            >
              Studio
            </Link>
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={withLocalePrefix(locale, "/about") as Route}
            >
              {copy.nav.about}
            </Link>
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={withLocalePrefix(locale, "/pricing") as Route}
            >
              {copy.nav.pricing}
            </Link>
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={withLocalePrefix(locale, "/contact") as Route}
            >
              {copy.nav.contact}
            </Link>
          </FooterColumn>

          <FooterColumn title={copy.nav.legal}>
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={withLocalePrefix(locale, "/privacy-policy") as Route}
            >
              {copy.nav.privacy}
            </Link>
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={withLocalePrefix(locale, "/terms-of-service") as Route}
            >
              {copy.nav.terms}
            </Link>
            <Link
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href={withLocalePrefix(locale, "/refund-policy") as Route}
            >
              Refund Policy
            </Link>
            <a
              className="text-sm text-foreground-soft transition hover:text-foreground"
              href="mailto:founder@omniacreata.com"
            >
              founder@omniacreata.com
            </a>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.06] pt-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 OmniaCreata.</p>
          <p>omniacreata.com</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
