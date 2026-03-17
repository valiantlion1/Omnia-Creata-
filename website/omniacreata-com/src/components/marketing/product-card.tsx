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
      className={`group block overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01)),rgba(8,8,8,0.92)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.36)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.2)] ${
        featured ? "gold-outline" : ""
      }`}
      href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(217,181,109,0.22)] bg-[rgba(217,181,109,0.08)] text-accent">
          <ProductGlyph className="stroke-current" slug={product.slug} />
        </div>
        {featured ? (
          <span className="rounded-full border border-[rgba(217,181,109,0.2)] bg-[rgba(217,181,109,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            {messages.common.flagshipStudio}
          </span>
        ) : null}
      </div>

      <div className="mt-8 space-y-4">
        <h3
          className={`font-semibold tracking-[-0.04em] text-foreground ${
            featured ? "text-3xl sm:text-[2.2rem]" : "text-[1.7rem]"
          }`}
        >
          {product.name}
        </h3>
        <p className="max-w-xl text-sm leading-7 text-foreground-soft">
          {product.shortDescription}
        </p>

        <div className="flex flex-wrap gap-2">
          {product.platformMatrix.slice(0, featured ? 4 : 3).map((entry) => (
            <PlatformBadge
              key={`${product.slug}-${entry.platform}`}
              platform={entry.platform}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-white/8 pt-4 text-sm">
          <span className="text-foreground-soft">Direct product page</span>
          <span className="text-accent transition group-hover:text-accent-strong">
            {messages.common.viewProduct}
          </span>
        </div>
      </div>
    </Link>
  );
}
