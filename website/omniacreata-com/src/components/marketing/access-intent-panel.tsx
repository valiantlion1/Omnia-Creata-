"use client";

import { useEffect } from "react";
import type { AccessLink, ProductRecord } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { withLocalePrefix } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { PlatformBadge } from "./platform-badge";

type AccessIntentPanelProps = {
  product: ProductRecord;
  entry: AccessLink | null;
  locale: LocaleCode;
  messages: Messages;
  onClose: () => void;
};

export function AccessIntentPanel({
  product,
  entry,
  locale,
  messages,
  onClose,
}: AccessIntentPanelProps) {
  useEffect(() => {
    if (!entry) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entry, onClose]);

  if (!entry) {
    return null;
  }

  const availableNow = product.platformMatrix
    .filter((candidate) => candidate.status === "live" && candidate.href)
    .slice(0, 3);

  const contactParams = new URLSearchParams({
    product: product.slug,
    platform: entry.platform,
    intent: entry.status === "planned" ? "planned_access" : "preview_access",
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="luxury-panel gold-outline relative z-10 w-full max-w-2xl rounded-[32px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
          {messages.accessPanel.eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          {messages.accessPanel.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-foreground-soft sm:text-base">
          {messages.accessPanel.description}
        </p>

        <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformBadge platform={entry.platform} />
          </div>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">{entry.note}</p>
        </div>

        {!!availableNow.length && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {messages.accessPanel.availableNow}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {availableNow.map((candidate) => (
                <ButtonLink
                  key={`${product.slug}-${candidate.platform}`}
                  href={withLocalePrefix(locale, candidate.href!)}
                  size="md"
                  variant="secondary"
                >
                  {candidate.label ?? messages.accessPanel.openAlternative}
                </ButtonLink>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink
            href={withLocalePrefix(locale, `/products/${product.slug}#access`)}
            size="md"
            variant="secondary"
          >
            {messages.accessPanel.backToHub}
          </ButtonLink>
          <ButtonLink
            href={withLocalePrefix(locale, `/contact?${contactParams.toString()}`)}
            size="md"
            variant="primary"
          >
            {messages.accessPanel.contactForAccess}
          </ButtonLink>
          <Button onClick={onClose} size="md" variant="ghost">
            {messages.accessPanel.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
