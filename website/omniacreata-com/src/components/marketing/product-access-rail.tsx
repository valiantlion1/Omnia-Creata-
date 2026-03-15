import type { ProductRecord } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { ButtonLink } from "@/components/ui/button";
import { ProductGlyph } from "@/components/ui/product-glyph";
import { withLocalePrefix } from "@/lib/utils";
import { PlatformBadge } from "./platform-badge";

type ProductAccessRailProps = {
  locale: LocaleCode;
  messages: Messages;
  products: ProductRecord[];
};

export function ProductAccessRail({
  locale,
  messages,
  products,
}: ProductAccessRailProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-5">
      {products.map((product) => (
        <div
          key={product.slug}
          className="luxury-panel rounded-[30px] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(217,181,109,0.2)] bg-[rgba(217,181,109,0.08)] text-accent">
              <ProductGlyph className="stroke-current" slug={product.slug} />
            </div>
            <PlatformBadge
              platform={product.surfaceType[0] ?? "web"}
            />
          </div>

          <p className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">
            {product.name}
          </p>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            {product.shortDescription}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {product.surfaceType.slice(0, 3).map((platform) => (
              <span
                key={`${product.slug}-${platform}`}
                className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted"
              >
                {platform}
              </span>
            ))}
          </div>

          <ButtonLink
            className="mt-5"
            href={withLocalePrefix(locale, `/products/${product.slug}`)}
            size="md"
            variant="primary"
          >
            {messages.common.openProductHub}
          </ButtonLink>
        </div>
      ))}
    </div>
  );
}
