import type { Route } from "next";
import Link from "next/link";
import { defaultLocale, type LocaleCode } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import { studioLandingHref, withLocalePrefix } from "@/lib/utils";
import { SocialLinks } from "@/components/social/social-links";
import { BrandMark } from "./brand-mark";

type FooterProps = {
  locale: LocaleCode;
  messages?: Messages;
};

export function Footer({ locale, messages }: FooterProps) {
  const copy = messages?.nav && messages?.common ? messages : getMessages(defaultLocale);
  const isTurkish = locale === "tr";

  return (
    <footer className="px-6 pb-10 pt-14 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px] border-t border-white/[0.09] pt-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_repeat(3,minmax(0,0.76fr))]">
          <div className="space-y-5">
            <BrandMark locale={locale} />
            <p className="max-w-md text-sm leading-7 text-foreground-soft">
              {isTurkish
                ? "Gorsel uretim icin zevkli yaratici yazilim. Studio ekosistemin merkezinde."
                : "Creative software for image work with taste. Studio leads the ecosystem."}
            </p>
          </div>

          <FooterColumn title={isTurkish ? "Gezin" : "Navigate"}>
            <FooterItem>
              <a
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={studioLandingHref(locale)}
              >
                Studio
              </a>
            </FooterItem>
            <FooterItem>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/about") as Route}
              >
                {copy.nav.about}
              </Link>
            </FooterItem>
            <FooterItem>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/pricing") as Route}
              >
                {copy.nav.pricing}
              </Link>
            </FooterItem>
            <FooterItem>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/contact") as Route}
              >
                {copy.nav.contact}
              </Link>
            </FooterItem>
          </FooterColumn>

          <FooterColumn title={copy.nav.legal}>
            <FooterItem>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/privacy-policy") as Route}
              >
                {copy.nav.privacy}
              </Link>
            </FooterItem>
            <FooterItem>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/terms-of-service") as Route}
              >
                {copy.nav.terms}
              </Link>
            </FooterItem>
            <FooterItem>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/refund-policy") as Route}
              >
                {isTurkish ? "Iade Politikasi" : "Refund Policy"}
              </Link>
            </FooterItem>
            <FooterItem>
              <a
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href="mailto:hello@omniacreata.com"
              >
                hello@omniacreata.com
              </a>
            </FooterItem>
          </FooterColumn>

          <FooterColumn title={isTurkish ? "Sosyal" : "Social"}>
            <li>
              <SocialLinks compact locale={locale} />
            </li>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.06] pt-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 OmniaCreata.</p>
          <p>www.omniacreata.com</p>
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
      <ul className="flex flex-col gap-3">{children}</ul>
    </div>
  );
}

function FooterItem({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}
