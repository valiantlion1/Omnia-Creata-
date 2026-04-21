import type { ProductRecord } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { studioUrl } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

type HQHeroSceneProps = {
  products: ProductRecord[];
  locale: LocaleCode;
  messages: Messages;
};

export function HQHeroScene({ products }: HQHeroSceneProps) {
  const studio = products[0];

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.86),rgba(9,13,18,0.98))] p-6 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
        Live route
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.4rem]">
        {studio.name}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
        {studio.roleDescription}
      </p>
      <div className="mt-8 border-t border-white/[0.08] pt-6">
        <ButtonLink href={studioUrl("/")} size="lg" variant="primary">
          Open Studio
        </ButtonLink>
      </div>
    </div>
  );
}
