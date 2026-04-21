"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { defaultLocale, type LocaleCode } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import {
  cn,
  studioAccessHref,
  studioAccessLabel,
  studioPageHref,
  withLocalePrefix,
} from "@/lib/utils";
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

  const navigation = useMemo(
    () => [
      { id: "studio", label: "Studio", href: studioPageHref(locale) },
      { id: "about", label: copy.nav.about, href: withLocalePrefix(locale, "/about") },
      { id: "contact", label: copy.nav.contact, href: withLocalePrefix(locale, "/contact") },
    ],
    [copy.nav.about, copy.nav.contact, locale],
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[rgba(8,12,18,0.82)] shadow-[0_20px_64px_rgba(3,10,18,0.26)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
            <BrandMark compact locale={locale} />

            <nav className="hidden items-center gap-1 lg:flex">
              {navigation.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
              <ButtonLink href={studioAccessHref(locale)} size="md" variant="primary">
                {studioAccessLabel()}
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
              mobileOpen ? "mb-4 mt-1 max-h-[480px] opacity-100" : "max-h-0 opacity-0",
            )}
            id="mobile-nav"
          >
            <div className="space-y-4 border-t border-white/8 px-4 pt-4 sm:px-5">
              <div className="grid gap-2">
                {navigation.map((item) => (
                  <Link
                    key={item.id}
                    className={cn(
                      "rounded-[18px] border border-white/8 px-4 py-3 text-left text-sm transition",
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

              <ButtonLink
                className="mb-1 w-full"
                href={studioAccessHref(locale)}
                size="lg"
                variant="primary"
              >
                {studioAccessLabel()}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
