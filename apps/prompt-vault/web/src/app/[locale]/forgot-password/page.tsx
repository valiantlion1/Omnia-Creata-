import { redirect } from "next/navigation";
import { AuthCard } from "@/components/site/auth-card";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale, localizeHref } from "@/lib/locale";
import { getServerAuthState } from "@/lib/server-auth";

export default async function ForgotPasswordPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const { enabled, user } = await getServerAuthState();

  if (enabled && user) {
    redirect(localizeHref(safeLocale, "/app"));
  }

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="flex justify-center">
          <AuthCard locale={safeLocale} mode="reset" />
        </div>
      </section>
    </MarketingShell>
  );
}
