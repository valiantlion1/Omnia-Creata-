"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAlternateLocale } from "@omnia-watch/i18n";
import type { Locale } from "@omnia-watch/types";
import { buttonVariants } from "@omnia-watch/ui";
import { cn } from "@omnia-watch/utils";

export function LanguageSwitcher({
  currentLocale,
  label
}: {
  currentLocale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const alternateLocale = getAlternateLocale(currentLocale);
  const translatedPath =
    pathname === `/${currentLocale}`
      ? `/${alternateLocale}`
      : pathname.replace(`/${currentLocale}`, `/${alternateLocale}`);

  return (
    <Link
      className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "rounded-full")}
      href={translatedPath}
      onClick={() => {
        document.cookie = `omnia-watch-locale=${alternateLocale};path=/;max-age=31536000`;
      }}
    >
      {label}
    </Link>
  );
}
