import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, ProgressBar, SectionHeading } from "@omnia-watch/ui";
import { getAppShellState } from "@/lib/server/app-data";

export default async function SettingsPage({
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
        eyebrow={dictionary.app.settings.title}
        title={dictionary.app.settings.title}
        description={dictionary.app.settings.description}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">Language preference</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            English is the default product language. Turkish ships from the start, and the locale
            architecture is already prepared for future expansion.
          </p>
          <div className="mt-6 rounded-2xl border border-line/60 bg-panel/40 p-4 text-sm text-muted">
            Current locale: {shell.preferences.locale}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">Release channel</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            The agent and SaaS foundations support stable and preview release channels so new
            capabilities can roll out carefully.
          </p>
          <div className="mt-6 rounded-2xl border border-line/60 bg-panel/40 p-4">
            <p className="text-sm text-muted">Channel readiness</p>
            <ProgressBar className="mt-3" value={72} />
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">Notifications</h2>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-line/60 bg-panel/40 p-4 text-sm text-muted">
              Recommendation digest: {shell.preferences.recommendationDigest ? "enabled" : "disabled"}
            </div>
            <div className="rounded-2xl border border-line/60 bg-panel/40 p-4 text-sm text-muted">
              Marketing emails: {shell.preferences.marketingEmails ? "enabled" : "disabled"}
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold text-text">Device defaults</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Scheduled scans, startup policies, and cleanup defaults will live here as the pairing
            and command model grows into its next phase.
          </p>
        </Card>
      </div>
    </div>
  );
}
