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
    <div className="luxury-panel gold-outline rounded-[36px] p-7 sm:p-9">
      <div className="grid gap-10 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
        <div className="max-w-xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
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
            <div
              id={platform.anchor}
              key={platform.key}
              className="soft-panel rounded-[28px] p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {platform.headline}
                </p>
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                  {platform.count}/5
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                {platform.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
