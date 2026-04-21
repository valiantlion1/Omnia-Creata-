import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getPlatformAvailability } from "@/content/platforms";
import { getProducts } from "@/content/products";
import { withLocalePrefix } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

type PlatformAccessBandProps = {
  locale: LocaleCode;
  messages: Messages;
};

export function PlatformAccessBand({
  locale,
  messages,
}: PlatformAccessBandProps) {
  const platformAvailability = getPlatformAvailability(locale);
  const products = getProducts(locale);
  const platformUsage = platformAvailability.map((platform) => ({
    ...platform,
    count: products.filter((product) =>
      product.platformMatrix.some((entry) => entry.platform === platform.key),
    ).length,
  }));

  return (
    <div className="overflow-hidden rounded-[34px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.9),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-9">
      <div className="grid gap-10 xl:grid-cols-[0.82fr_1.18fr] xl:items-start">
        <div className="max-w-xl space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
            {messages.home.platformBandEyebrow}
          </p>
          <h3 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            {messages.home.platformBandTitle}
          </h3>
          <p className="text-base leading-8 text-foreground-soft">
            {messages.home.platformBandDescription}
          </p>
          <ButtonLink
            href={withLocalePrefix(locale, "/products")}
            size="lg"
            variant="secondary"
          >
            {messages.common.exploreEcosystem}
          </ButtonLink>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {platformUsage.map((platform) => (
            <article
              id={platform.anchor}
              key={platform.key}
              className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {platform.headline}
                </p>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                  {platform.count}/5
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                {platform.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
