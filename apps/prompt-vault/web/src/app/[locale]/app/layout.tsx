import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { assertLocale } from "@/lib/locale";
import { localizeHref } from "@/lib/locale";
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
  const { enabled, user } = await getServerAuthState();

  if (enabled && !user) {
    redirect(localizeHref(safeLocale, "/sign-in"));
  }

  return <AppShell locale={safeLocale}>{children}</AppShell>;
}
