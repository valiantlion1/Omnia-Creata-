"use client";

import type { MessageDictionary, MessageValue } from "@prompt-vault/i18n";
import type { Locale } from "@prompt-vault/types";
import { createContext, useContext, type ReactNode } from "react";

interface LocaleContextValue {
  locale: Locale;
  messages: MessageDictionary;
  t: (path: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale,
  messages
}: {
  children: ReactNode;
  locale: Locale;
  messages: MessageDictionary;
}) {
  return (
    <LocaleContext.Provider
      value={{
        locale,
        messages,
        t: (path) => translateFromMessages(messages, path)
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocaleContext must be used within LocaleProvider.");
  }

  return context;
}

function getValue(dictionary: MessageDictionary, path: string): MessageValue | undefined {
  return path.split(".").reduce<MessageValue | undefined>((current, segment) => {
    if (!current || typeof current === "string" || Array.isArray(current)) {
      return undefined;
    }

    return current[segment];
  }, dictionary);
}

function translateFromMessages(messages: MessageDictionary, path: string): string {
  const value = getValue(messages, path);
  return typeof value === "string" ? value : path;
}
