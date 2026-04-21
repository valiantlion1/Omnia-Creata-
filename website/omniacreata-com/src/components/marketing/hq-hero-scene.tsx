import type { Route } from "next";
import Link from "next/link";
import type { ProductRecord, ProductSlug } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { withLocalePrefix } from "@/lib/utils";
import { ProductGlyph } from "@/components/ui/product-glyph";
import { PlatformBadge } from "./platform-badge";

type HQHeroSceneProps = {
  products: ProductRecord[];
  locale: LocaleCode;
  messages: Messages;
};

const productRoles: Record<ProductSlug, string> = {
  "omnia-creata-studio": "Flagship workspace",
  omniapixels: "Visual product",
  omniaorganizer: "Operational layer",
  "prompt-vault": "Prompt system",
  "omnia-watch": "Monitoring layer",
};

function statusLabel(messages: Messages, status: ProductRecord["status"]) {
  if (status === "live") return messages.common.live;
  if (status === "preview") return messages.common.preview;
  return messages.common.planned;
}

function statusClass(status: ProductRecord["status"]) {
  if (status === "live") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  if (status === "preview") return "border-sky-200/20 bg-sky-200/10 text-sky-100";
  return "border-white/10 bg-white/[0.05] text-zinc-200";
}

export function HQHeroScene({ products, locale, messages }: HQHeroSceneProps) {
  const studio = products[0];
  const sideProducts = products.slice(1);

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,25,34,0.96),rgba(10,14,20,0.98))] p-5 shadow-[0_30px_90px_rgba(3,10,18,0.32)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(188,209,229,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(113,137,165,0.12),transparent_34%)]" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Omnia HQ
            </p>
            <p className="mt-2 text-sm text-foreground-soft">
              Studio-first public entry with direct product routing.
            </p>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground-soft">
            {products.length} products
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <Link
            className="group rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(24,33,44,0.92),rgba(15,21,29,0.96))] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]"
            href={withLocalePrefix(locale, `/products/${studio.slug}`) as Route}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.08] bg-[rgba(188,209,229,0.08)] text-accent">
                <ProductGlyph className="stroke-current" slug={studio.slug} />
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusClass(studio.status)}`}>
                {statusLabel(messages, studio.status)}
              </span>
            </div>

            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                {productRoles[studio.slug]}
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.5rem]">
                {studio.name}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-foreground-soft sm:text-[15px]">
                {studio.summary}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {studio.platformMatrix.slice(0, 4).map((entry) => (
                <PlatformBadge key={`${studio.slug}-${entry.platform}`} platform={entry.platform} />
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground-soft">
                Flagship route with the clearest public story right now.
              </div>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground-soft">
                Studio stays the center of gravity while the rest of Omnia expands.
              </div>
            </div>
          </Link>

          <div className="grid gap-3">
            {sideProducts.map((product) => (
              <Link
                key={product.slug}
                className="group flex items-start justify-between gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05]"
                href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
                    {productRoles[product.slug]}
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground-soft">
                    {product.shortDescription}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusClass(product.status)}`}>
                  {statusLabel(messages, product.status)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.85fr_0.85fr]">
          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm leading-7 text-foreground-soft">
            One public HQ for Studio access, product routes, pricing, and company contact.
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-foreground transition hover:bg-white/[0.07]"
            href={withLocalePrefix(locale, "/pricing") as Route}
          >
            {messages.common.viewPricing}
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-foreground transition hover:bg-white/[0.07]"
            href={withLocalePrefix(locale, "/contact") as Route}
          >
            {messages.common.contactTeam}
          </Link>
        </div>
      </div>
    </div>
  );
}
