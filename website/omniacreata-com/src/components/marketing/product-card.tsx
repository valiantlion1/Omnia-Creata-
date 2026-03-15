import type { Route } from "next";
import Link from "next/link";
import type { ProductRecord } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { withLocalePrefix } from "@/lib/utils";
import { ProductGlyph } from "@/components/ui/product-glyph";
import { PlatformBadge } from "./platform-badge";

type ProductCardProps = {
  locale: LocaleCode;
  messages: Messages;
  product: ProductRecord;
  featured?: boolean;
};

export function ProductCard({
  locale,
  messages,
  product,
  featured = false,
}: ProductCardProps) {
  return (
    <Link
      className={`group luxury-panel block rounded-[30px] p-6 transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.22)] ${
        featured ? "gold-outline" : ""
      }`}
      href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(217,181,109,0.22)] bg-[rgba(217,181,109,0.08)] text-accent">
          <ProductGlyph className="stroke-current" slug={product.slug} />
        </div>
        <div className="pt-1">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {product.name}
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <p className="text-sm leading-7 text-foreground-soft">
          {product.shortDescription}
        </p>

        <div className="flex flex-wrap gap-2">
          {product.platformMatrix.slice(0, 3).map((entry) => (
            <PlatformBadge
              key={`${product.slug}-${entry.platform}`}
              platform={entry.platform}
            />
          ))}
        </div>

        <div className="border-t border-white/8 pt-4 text-sm text-accent transition group-hover:text-accent-strong">
          {messages.common.viewProduct}
        </div>
      </div>
    </Link>
  );
}
