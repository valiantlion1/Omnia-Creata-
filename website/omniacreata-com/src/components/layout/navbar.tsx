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
      { id: "about", label: copy.nav.about, href: withLocalePrefix(locale, "/about") },
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
      <div className="mx-auto max-w-[1280px]">
        <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[rgba(8,12,18,0.78)] shadow-[0_22px_72px_rgba(3,10,18,0.28)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <BrandMark compact locale={locale} />
              <div className="hidden lg:flex lg:flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
                  {copy.utility.globalSite}
                </span>
                <span className="mt-1 text-xs text-muted">Studio at the center</span>
              </div>
            </div>

            <nav className="hidden items-center gap-1 lg:flex">
              {navigation.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.id}
                    className={cn(
                      "rounded-full px-4 py-2.5 text-sm transition duration-300",
                      active
                        ? "bg-white/[0.08] text-foreground"
                        : "text-foreground-soft hover:bg-white/[0.04] hover:text-foreground",
                    )}
                    href={item.href as Route}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-muted">
                EN
              </div>
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
              className="inline-flex min-w-[84px] items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition hover:border-white/[0.16] hover:bg-white/[0.06] lg:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              type="button"
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-[max-height,opacity,margin] duration-300 lg:hidden",
              mobileOpen ? "mb-4 mt-1 max-h-[960px] opacity-100" : "max-h-0 opacity-0",
            )}
            id="mobile-nav"
          >
            <div className="space-y-4 border-t border-white/8 px-4 pt-4 sm:px-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {navigation.map((item) => {
                  return (
                    <Link
                      key={item.id}
                      className={cn(
                        "rounded-[20px] border border-white/8 px-4 py-3 text-left text-sm transition",
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? "bg-white/[0.08] text-foreground"
                          : "bg-white/[0.03] text-foreground-soft hover:bg-white/[0.05] hover:text-foreground",
                      )}
                      href={item.href as Route}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                  Studio-first routing
                </p>
                <div className="mt-3 space-y-2">
                  {products.map((product) => (
                    <Link
                      key={product.slug}
                      className="block rounded-[20px] border border-white/8 px-4 py-3 text-sm text-foreground-soft transition hover:bg-white/[0.05] hover:text-foreground"
                      href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
                      onClick={() => setMobileOpen(false)}
                    >
                      {product.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {secondaryLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-foreground-soft transition hover:bg-white/[0.05] hover:text-foreground"
                    href={item.href as Route}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <ButtonLink
                className="mb-1 w-full"
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
    </header>
  );
}
