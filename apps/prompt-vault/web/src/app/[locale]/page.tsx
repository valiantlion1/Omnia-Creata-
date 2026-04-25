import { brand } from "@prompt-vault/config";
import { getMessages } from "@prompt-vault/i18n";
import type { Locale } from "@prompt-vault/types";
import Link from "next/link";
import { MarketingShell } from "@/components/site/marketing-shell";
import { Badge, Button, SectionHeading, Surface } from "@/components/ui/primitives";
import { assertLocale, localizeHref } from "@/lib/locale";

interface EntryMessages {
  common: {
    launchApp: string;
    productName: string;
    parentBrand: string;
    signIn: string;
    signUp: string;
  };
  marketing: {
    entryEyebrow: string;
    entryTitle: string;
    entryDescription: string;
    entryHighlights: string[];
    entryCards: Array<{
      title: string;
      description: string;
    }>;
    entryProductLink: string;
    entryMainSiteLink: string;
  };
}

function getEntryMessages(locale: Locale): EntryMessages {
  return getMessages(locale) as unknown as EntryMessages;
}

export default async function AppEntryPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const messages = getEntryMessages(safeLocale);

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="space-y-8">
          <Badge tone="accent">{messages.marketing.entryEyebrow}</Badge>
          <div className="space-y-5">
            <h1 className="font-display text-5xl leading-[0.98] tracking-[-0.07em] text-[var(--text-primary)] md:text-7xl">
              {messages.marketing.entryTitle}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              {messages.marketing.entryDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={localizeHref(safeLocale, "/app")}>
              <Button size="lg">{messages.common.launchApp}</Button>
            </Link>
            <Link href={localizeHref(safeLocale, "/sign-up")}>
              <Button size="lg" variant="secondary">
                {messages.common.signUp}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
            <Link
              className="transition hover:text-[var(--text-primary)]"
              href={localizeHref(safeLocale, "/app")}
            >
              {messages.common.signIn}
            </Link>
            <a
              className="transition hover:text-[var(--text-primary)]"
              href={brand.productUrl}
              rel="noreferrer"
              target="_blank"
            >
              {messages.marketing.entryProductLink}
            </a>
            <a
              className="transition hover:text-[var(--text-primary)]"
              href={brand.marketingUrl}
              rel="noreferrer"
              target="_blank"
            >
              {messages.marketing.entryMainSiteLink}
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {messages.marketing.entryHighlights.map((item) => (
              <Surface key={item} className="p-4 text-sm leading-7 text-[var(--text-secondary)]">
                {item}
              </Surface>
            ))}
          </div>
        </div>
        <Surface className="overflow-hidden p-5 md:p-6">
          <SectionHeading
            eyebrow={messages.common.parentBrand}
            title={messages.common.productName}
            description={messages.marketing.entryDescription}
          />
          <div className="mt-6 space-y-4">
            {messages.marketing.entryCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[26px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--accent-soft),var(--surface))] p-5"
              >
                <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </MarketingShell>
  );
}
