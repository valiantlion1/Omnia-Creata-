import type { Route } from "next";
import Link from "next/link";
import { getProducts } from "@/content/products";
import { getPlatformAvailability } from "@/content/platforms";
import { defaultLocale, type LocaleCode } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import { withLocalePrefix } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

type FooterProps = {
  locale: LocaleCode;
  messages?: Messages;
};

export function Footer({ locale, messages }: FooterProps) {
  const copy = messages?.nav && messages?.common ? messages : getMessages(defaultLocale);
  const products = getProducts(locale);
  const platformAvailability = getPlatformAvailability(locale);

  return (
    <footer className="px-6 pb-10 pt-12 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="luxury-panel rounded-[32px] px-6 py-10 sm:px-8 lg:px-10">
          <div className="grid gap-10 xl:grid-cols-[1.3fr_repeat(5,minmax(0,1fr))]">
            <div className="space-y-5">
              <BrandMark locale={locale} />
              <p className="max-w-sm text-sm leading-7 text-foreground-soft">
                Omnia Creata is a premium software ecosystem with connected flagship products.
              </p>
            </div>

            <FooterColumn title={copy.nav.products}>
              {products.map((product) => (
                <Link
                  key={product.slug}
                  className="text-sm text-foreground-soft transition hover:text-foreground"
                  href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
                >
                  {product.name}
                </Link>
              ))}
            </FooterColumn>

            <FooterColumn title={copy.nav.platforms}>
              {platformAvailability.map((platform) => (
                <Link
                  key={platform.key}
                  className="text-sm text-foreground-soft transition hover:text-foreground"
                  href={withLocalePrefix(locale, `/#${platform.anchor}`) as Route}
                >
                  {platform.headline}
                </Link>
              ))}
            </FooterColumn>

            <FooterColumn title={copy.nav.company}>
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
            </FooterColumn>

            <FooterColumn title={copy.nav.contact}>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/contact") as Route}
              >
                {copy.nav.contact}
              </Link>
              <a
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href="mailto:hello@omniacreata.com"
              >
                hello@omniacreata.com
              </a>
            </FooterColumn>

            <FooterColumn title="Social">
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/contact") as Route}
              >
                News and announcements
              </Link>
              <Link
                className="text-sm text-foreground-soft transition hover:text-foreground"
                href={withLocalePrefix(locale, "/about") as Route}
              >
                Company updates
              </Link>
            </FooterColumn>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/8 pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>(c) 2026 Omnia Creata. All rights reserved.</p>
            <p>omniacreata.com</p>
          </div>
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
