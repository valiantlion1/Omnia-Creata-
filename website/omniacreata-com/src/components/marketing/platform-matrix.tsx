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

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <div
              key={`${product.slug}-${entry.platform}`}
              className="soft-panel rounded-[30px] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PlatformBadge platform={entry.platform} />
                <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
                  Product access
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground-soft">{entry.note}</p>
              {liveEntryHref ? (
                <ButtonLink
                  className="mt-5"
                  href={liveEntryHref}
                  size="md"
                  variant="primary"
                >
                  {label}
                </ButtonLink>
              ) : (
                <Button
                  className="mt-5"
                  onClick={() => setActiveEntry(entry)}
                  size="md"
                  variant="secondary"
                >
                  {label}
                </Button>
              )}
            </div>
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
