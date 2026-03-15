import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";
import { getAppShellState } from "@/lib/server/app-data";

export default async function AccountPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const shell = await getAppShellState(locale);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={dictionary.app.account.title}
        title={dictionary.app.account.title}
        description={dictionary.app.account.description}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">Profile</h2>
          <div className="mt-6 space-y-3 text-sm text-muted">
            <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
              {shell.user.fullName}
            </div>
            <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
              {shell.user.email}
            </div>
            <div className="rounded-2xl border border-line/60 bg-panel/40 p-4">
              {shell.user.companyName}
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">Subscription readiness</h2>
          <div className="mt-6 rounded-2xl border border-line/60 bg-panel/40 p-4">
            <p className="text-sm text-muted">Current plan</p>
            <p className="mt-2 text-3xl font-semibold text-text">{shell.plan.name}</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Billing, plan gates, and account surfaces are scaffolded so Stripe or an equivalent
              provider can be added without redesigning the domain model later.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
