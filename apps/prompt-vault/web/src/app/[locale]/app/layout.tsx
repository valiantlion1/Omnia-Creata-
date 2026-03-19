import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { IntroGate } from "@/components/app/intro-gate";
import { assertLocale } from "@/lib/locale";
import { getServerAuthState } from "@/lib/server-auth";

export default async function ProductAppLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const { user } = await getServerAuthState();

  return (
    <IntroGate hasUser={Boolean(user)} locale={safeLocale}>
      <AppShell locale={safeLocale}>{children}</AppShell>
    </IntroGate>
  );
}
