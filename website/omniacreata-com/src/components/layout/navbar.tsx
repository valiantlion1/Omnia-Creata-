"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { defaultLocale, type LocaleCode } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import {
  cn,
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
      { id: "about", label: copy.nav.about, href: withLocalePrefix(locale, "/about") },
      { id: "contact", label: copy.nav.contact, href: withLocalePrefix(locale, "/contact") },
    ],
    [copy.nav.about, copy.nav.contact, locale],
  );

  function isActive(item: { id: string; href: string }) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.09] bg-[rgba(7,7,6,0.82)] px-3 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1340px]">
        <div className="relative w-full">
          <div className="relative flex h-20 items-center justify-between gap-3 pr-24 sm:gap-4 lg:pr-0">
            <BrandMark compact locale={locale} />

            <nav className="hidden items-center gap-1 lg:flex">
              {navigation.map((item) => {
                const active = isActive(item);

                return (
                  <Link
                    key={item.id}
                    className={cn(
                      "rounded-full px-4 py-2.5 text-sm text-foreground-soft transition duration-300",
                      active
                        ? "bg-white/[0.06] text-foreground"
                        : "hover:bg-white/[0.035] hover:text-foreground",
                    )}
                    href={item.href as Route}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <ButtonLink href={withLocalePrefix(locale, "/contact")} size="md" variant="primary">
                {copy.nav.contact}
              </ButtonLink>
            </div>

            <button
              aria-controls="mobile-nav"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="absolute right-0 top-1/2 inline-flex min-h-11 min-w-[78px] -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-[rgba(216,181,109,0.42)] bg-[rgba(14,15,13,0.92)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-[0_18px_46px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-[rgba(216,181,109,0.62)] hover:bg-white/[0.06] sm:min-w-[88px] sm:px-4 sm:tracking-[0.18em] lg:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              type="button"
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>
          </div>

          <div
            aria-hidden={!mobileOpen}
            className={cn(
              "overflow-hidden transition-[max-height,opacity,margin] duration-300 lg:hidden",
              mobileOpen ? "mb-4 mt-1 max-h-[480px] opacity-100" : "max-h-0 opacity-0",
            )}
            hidden={!mobileOpen}
            id="mobile-nav"
          >
            <div className="space-y-4 border-t border-white/8 pb-4 pt-4">
              <div className="grid gap-2">
                {navigation.map((item) => (
                  <Link
                    key={item.id}
                    className={cn(
                      "rounded-[18px] border border-white/8 px-4 py-3 text-left text-sm transition",
                      isActive(item)
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
                href={withLocalePrefix(locale, "/contact")}
                size="lg"
                variant="primary"
              >
                {copy.nav.contact}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
