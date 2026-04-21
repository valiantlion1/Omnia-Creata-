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
  const statusLabel =
    product.status === "live"
      ? messages.common.live
      : product.status === "preview"
        ? messages.common.preview
        : messages.common.planned;

  const statusClass =
    product.status === "live"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : product.status === "preview"
        ? "border-sky-200/20 bg-sky-200/10 text-sky-100"
        : "border-white/10 bg-white/[0.05] text-zinc-200";

  return (
    <Link
      className={`group flex h-full flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,26,36,0.9),rgba(10,14,20,0.96))] p-6 shadow-[0_24px_64px_rgba(3,10,18,0.2)] transition duration-300 hover:-translate-y-1 hover:border-white/[0.14] ${
        featured ? "gold-outline md:p-7" : ""
      }`}
      href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.08] bg-[rgba(188,209,229,0.08)] text-accent">
          <ProductGlyph className="stroke-current" slug={product.slug} />
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              {featured ? product.badge : product.roleTitle}
            </p>
            <h3
              className={`mt-3 font-semibold tracking-[-0.04em] text-foreground ${
                featured ? "text-3xl sm:text-[2.35rem]" : "text-[1.7rem]"
              }`}
            >
              {product.name}
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-foreground-soft">
            {product.shortDescription}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {product.platformMatrix.slice(0, featured ? 4 : 3).map((entry) => (
            <PlatformBadge
              key={`${product.slug}-${entry.platform}`}
              platform={entry.platform}
            />
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/[0.08] pt-5 text-sm">
          <span className="text-foreground-soft">{featured ? messages.common.flagshipStudio : product.badge}</span>
          <span className="text-foreground transition group-hover:text-accent">
            {messages.common.viewProduct}
          </span>
        </div>
      </div>
    </Link>
  );
}
