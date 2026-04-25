"use client";

import { brand, releaseNotes } from "@prompt-vault/config";
import { BellRing, Clock3, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { formatDate, formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";
import Link from "next/link";
import type { ReactNode } from "react";

export function RecentView() {
  const { dataset } = useVault();
  const { locale } = useLocaleContext();
  const latestRelease = releaseNotes[0];

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeader
        actions={
          <Link href={localizeHref(locale, "/app/settings")}>
            <Button variant="secondary">
              <BellRing className="h-4 w-4" />
              {locale === "tr" ? "Ayarlar" : "Settings"}
            </Button>
          </Link>
        }
        subtitle={
          locale === "tr"
            ? "Uygulamadaki son degisiklikleri ve yakin zamanda dokundugun kayitlari tek yerde takip et."
            : "Track app changes and the entries you touched recently in one place."
        }
        title={locale === "tr" ? "Guncelleme notlari" : "Update notes"}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <Surface className="rounded-[28px] bg-[var(--surface)] p-5 md:p-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                {locale === "tr" ? "En guncel surum" : "Latest build"}
              </Badge>
              <Badge>{latestRelease.version}</Badge>
              <Badge tone="info">{formatDate(latestRelease.publishedAt, locale)}</Badge>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)]">
                {latestRelease.title[locale]}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
                {latestRelease.summary[locale]}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {latestRelease.highlights.map((item, index) => (
                <div
                  key={`${latestRelease.id}-${index}`}
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-7 text-[var(--text-primary)]">{item[locale]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="rounded-[28px] bg-[var(--surface)] p-5 md:p-6">
          <div className="space-y-4">
            <SectionHeader
              icon={<Clock3 className="h-4 w-4" />}
              title={locale === "tr" ? `${brand.name} durumu` : `${brand.name} status`}
            />
            <div className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <p>
                {locale === "tr"
                  ? "Burada yalnizca seni ilgilendiren uygulama degisiklikleri ve calisma alani hareketleri gorunur."
                  : "This area shows useful app changes and workspace movement without release-process noise."}
              </p>
              <p>
                {locale === "tr"
                  ? "Onemli duzenlemeler, kayit davranislari ve gunluk kullanimdaki iyilestirmeler burada toplanir."
                  : "Important fixes, writing-flow changes, and daily-use improvements are collected here."}
              </p>
            </div>
            <div className="grid gap-3">
              <MiniStat
                label={locale === "tr" ? "Surum notu" : "Release notes"}
                value={String(releaseNotes.length)}
              />
              <MiniStat
                label={locale === "tr" ? "Aktivite" : "Activity items"}
                value={String(dataset.activities.length)}
              />
              <MiniStat
                label={locale === "tr" ? "Taslak" : "Local drafts"}
                value={String(dataset.drafts.length)}
              />
            </div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Surface className="rounded-[28px] bg-[var(--surface)] p-5 md:p-6">
          <div className="space-y-4">
            <SectionHeader
              icon={<BellRing className="h-4 w-4" />}
              title={locale === "tr" ? "Surum gecmisi" : "Release history"}
            />
            <div className="space-y-3">
              {releaseNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={note.id === latestRelease.id ? "accent" : "default"}>
                      {note.version}
                    </Badge>
                    <Badge>{formatDate(note.publishedAt, locale)}</Badge>
                  </div>
                  <div className="mt-3 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {note.title[locale]}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {note.summary[locale]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="rounded-[28px] bg-[var(--surface)] p-5 md:p-6">
          <div className="space-y-4">
            <SectionHeader
              icon={<Clock3 className="h-4 w-4" />}
              title={locale === "tr" ? "Son hareketler" : "Recent activity"}
            />
            <div className="space-y-3">
              {dataset.activities.length > 0 ? (
                dataset.activities.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {activity.entryTitle ?? activity.promptTitle}
                      </div>
                      <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        {formatRelative(activity.createdAt, locale)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {activity.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                  {locale === "tr"
                    ? "Henuz goruntulenecek hareket yok."
                    : "There is no activity to show yet."}
                </div>
              )}
            </div>
          </div>
        </Surface>
      </section>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-strong)]">
        {icon}
      </div>
      <h2 className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
        {title}
      </h2>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
