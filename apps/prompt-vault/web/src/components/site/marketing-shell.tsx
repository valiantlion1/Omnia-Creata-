import type { Locale } from "@prompt-vault/types";
import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/site/marketing-footer";
import { MarketingHeader } from "@/components/site/marketing-header";

export function MarketingShell({
  children,
  locale
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <div className="min-h-screen">
      <MarketingHeader locale={locale} />
      <main>{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
