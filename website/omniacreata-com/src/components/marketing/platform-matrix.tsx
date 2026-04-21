"use client";

import { useState } from "react";
import type { ProductRecord } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { withLocalePrefix } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { AccessIntentPanel } from "./access-intent-panel";
import { PlatformBadge } from "./platform-badge";

type PlatformMatrixProps = {
  product: ProductRecord;
  locale: LocaleCode;
  messages: Messages;
};

export function PlatformMatrix({ product, locale, messages }: PlatformMatrixProps) {
  const [activeEntry, setActiveEntry] = useState<(typeof product.platformMatrix)[number] | null>(
    null,
  );

  const getStatusLabel = (status: (typeof product.platformMatrix)[number]["status"]) => {
    if (status === "live") return messages.common.live;
    if (status === "preview") return messages.common.preview;
    return messages.common.planned;
  };

  const getStatusClass = (status: (typeof product.platformMatrix)[number]["status"]) => {
    if (status === "live") {
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    }
    if (status === "preview") {
      return "border-sky-200/20 bg-sky-200/10 text-sky-100";
    }
    return "border-white/10 bg-white/[0.05] text-zinc-200";
  };

  return (
    <>
      <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.88),rgba(10,14,20,0.96))] shadow-[0_24px_72px_rgba(3,10,18,0.22)]">
        {product.platformMatrix.map((entry) => {
          const label =
            entry.label ??
            (entry.platform === "web"
              ? messages.common.openWeb
              : entry.platform === "desktop"
                ? messages.common.openDesktop
                : entry.platform === "pwa"
                  ? messages.common.installPwa
                  : entry.platform === "ios"
                    ? messages.common.iosAccess
                    : messages.common.androidAccess);

          const liveEntryHref =
            entry.status === "live" && entry.href
              ? withLocalePrefix(locale, entry.href)
              : null;

          return (
            <article
              key={`${product.slug}-${entry.platform}`}
              className="grid gap-5 border-t border-white/[0.08] px-5 py-5 first:border-t-0 md:grid-cols-[0.9fr_1.4fr_auto] md:items-center md:px-6"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <PlatformBadge platform={entry.platform} />
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${getStatusClass(entry.status)}`}>
                    {getStatusLabel(entry.status)}
                  </span>
                </div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                  Product access
                </p>
              </div>
              <p className="text-sm leading-7 text-foreground-soft">{entry.note}</p>
              <div className="md:justify-self-end">
                {liveEntryHref ? (
                  <ButtonLink
                    href={liveEntryHref}
                    size="md"
                    variant="primary"
                  >
                    {label}
                  </ButtonLink>
                ) : (
                  <Button
                    onClick={() => setActiveEntry(entry)}
                    size="md"
                    variant="secondary"
                  >
                    {label}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <AccessIntentPanel
        entry={activeEntry}
        locale={locale}
        messages={messages}
        onClose={() => setActiveEntry(null)}
        product={product}
      />
    </>
  );
}
