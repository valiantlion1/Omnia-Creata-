"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { getProducts } from "@/content/products";
import { defaultLocale, type LocaleCode } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import { cn, withLocalePrefix } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { BrandMark } from "./brand-mark";

type NavbarProps = {
  locale: LocaleCode;
  messages?: Messages;
};

export function Navbar({ locale, messages }: NavbarProps) {
  const copy = messages?.nav && messages?.common ? messages : getMessages(defaultLocale);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const products = useMemo(() => getProducts(locale), [locale]);
  const studio = products[0];

  const navigation = useMemo(
    () => [
      { id: "products", label: copy.nav.products, href: withLocalePrefix(locale, "/products") },
      { id: "pricing", label: copy.nav.pricing, href: withLocalePrefix(locale, "/pricing") },
      { id: "contact", label: copy.nav.contact, href: withLocalePrefix(locale, "/contact") },
    ],
    [copy, locale],
  );

  const secondaryLinks = [
    { label: copy.nav.about, href: withLocalePrefix(locale, "/about") },
    { label: copy.nav.privacy, href: withLocalePrefix(locale, "/privacy-policy") },
    { label: copy.nav.terms, href: withLocalePrefix(locale, "/terms-of-service") },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="luxury-panel overflow-hidden rounded-[28px] border border-[rgba(217,181,109,0.14)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-2 sm:px-5">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-accent">
              <span>{copy.utility.globalSite}</span>
              <span className="h-1 w-1 rounded-full bg-accent" />
              <span className="text-muted">{copy.utility.availability}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-foreground-soft">
              <span className="uppercase tracking-[0.2em] text-muted">{copy.utility.localeLabel}</span>
              <span className="font-medium text-foreground">EN</span>
            </div>
          </div>

          <div className="px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <BrandMark compact locale={locale} />

              <nav className="hidden items-center gap-1 xl:flex">
                {navigation.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.id}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm transition duration-300",
                        active
                          ? "bg-white/[0.08] text-foreground"
                          : "text-foreground-soft hover:bg-white/[0.05] hover:text-foreground",
                      )}
                      href={item.href as Route}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden xl:block">
                <ButtonLink
                  href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                  size="md"
                  variant="primary"
                >
                  {copy.common.openStudio}
                </ButtonLink>
              </div>

              <button
                aria-controls="mobile-nav"
                aria-expanded={mobileOpen}
                aria-label="Toggle navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground transition hover:border-[rgba(217,181,109,0.24)] hover:bg-white/[0.08] xl:hidden"
                onClick={() => setMobileOpen((value) => !value)}
                type="button"
              >
                <span className="text-lg">{mobileOpen ? "x" : "+"}</span>
              </button>
            </div>

            <div
              className={cn(
                "overflow-hidden transition-[max-height,opacity,margin] duration-300 xl:hidden",
                mobileOpen ? "mt-4 max-h-[960px] opacity-100" : "max-h-0 opacity-0",
              )}
              id="mobile-nav"
            >
              <div className="space-y-4 border-t border-white/8 pt-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {navigation.map((item) => (
                    <Link
                      key={item.id}
                      className={cn(
                        "rounded-2xl border border-white/8 px-4 py-3 text-left text-sm transition",
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? "bg-white/[0.08] text-foreground"
                          : "bg-white/[0.03] text-foreground-soft hover:bg-white/[0.05] hover:text-foreground",
                      )}
                      href={item.href as Route}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    {copy.nav.products}
                  </p>
                  <div className="mt-3 space-y-3">
                    {products.map((product) => (
                      <Link
                        key={product.slug}
                        className="block rounded-[22px] border border-white/8 bg-black/20 p-4"
                        href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
                        onClick={() => setMobileOpen(false)}
                      >
                        <p className="text-base font-semibold text-foreground">{product.name}</p>
                        <p className="mt-2 text-sm leading-6 text-foreground-soft">
                          {product.shortDescription}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {secondaryLinks.map((item) => (
                    <Link
                      key={item.href}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-foreground-soft transition hover:bg-white/[0.05] hover:text-foreground"
                      href={item.href as Route}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <ButtonLink
                  className="w-full"
                  href={withLocalePrefix(locale, `/products/${studio.slug}`)}
                  size="lg"
                  variant="primary"
                >
                  {copy.common.openStudio}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
