import type { MessageDictionary } from "@prompt-vault/i18n";
import type { Locale } from "@prompt-vault/types";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/providers/locale-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { VaultProvider } from "@/providers/vault-provider";

export function AppProviders({
  children,
  locale,
  messages
}: {
  children: ReactNode;
  locale: Locale;
  messages: MessageDictionary;
}) {
  return (
    <ThemeProvider>
      <LocaleProvider locale={locale} messages={messages}>
        <ToastProvider>
          <VaultProvider>{children}</VaultProvider>
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
