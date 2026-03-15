import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getPlatformAvailability } from "@/content/platforms";
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

  return (
    <div className="grid gap-5 xl:grid-cols-5">
      {platformAvailability.map((platform) => (
        <div
          id={platform.anchor}
          key={platform.key}
          className="luxury-panel rounded-[30px] p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
            {platform.headline}
          </p>
          <p className="mt-4 text-sm leading-7 text-foreground-soft">
            {platform.description}
          </p>
          <ButtonLink
            className="mt-5"
            href={withLocalePrefix(locale, "/products")}
            size="md"
            variant="secondary"
          >
            {messages.common.exploreEcosystem}
          </ButtonLink>
        </div>
      ))}
    </div>
  );
}
