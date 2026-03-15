import { getMessages } from "@prompt-vault/i18n";
import type { Locale } from "@prompt-vault/types";
import { locales } from "@prompt-vault/types";
import type { ReactNode } from "react";
import { AppProviders } from "@/providers/app-providers";
import { assertLocale } from "@/lib/locale";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale) as Locale;
  const messages = getMessages(safeLocale);

  return (
    <AppProviders locale={safeLocale} messages={messages}>
      {children}
    </AppProviders>
  );
}
