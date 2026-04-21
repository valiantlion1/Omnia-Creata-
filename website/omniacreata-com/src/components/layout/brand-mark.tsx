import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { cn, withLocalePrefix } from "@/lib/utils";

type BrandMarkProps = {
  locale: string;
  compact?: boolean;
  className?: string;
};

export function BrandMark({
  locale,
  compact = false,
  className,
}: BrandMarkProps) {
  const topLabel = locale === "tr" ? "Studio merkezli HQ" : "Studio-first HQ";
  const subLabel =
    locale === "tr"
      ? "Public giris ve urun yonlendirmesi"
      : "Public entry and product routing";

  return (
    <Link
      className={cn("group inline-flex items-center gap-3.5", className)}
      href={withLocalePrefix(locale, "/") as Route}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-white/10 bg-[rgba(10,14,20,0.92)] shadow-[0_18px_40px_rgba(3,10,18,0.26)] transition duration-300 group-hover:border-white/[0.16] group-hover:shadow-[0_24px_60px_rgba(3,10,18,0.34)]",
          compact ? "h-11 w-11 rounded-[16px] p-2" : "h-14 w-14 rounded-[20px] p-2.5",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,209,229,0.2),transparent_58%)]" />
        <Image
          alt="Omnia Creata"
          className="relative z-10 h-full w-full object-contain"
          height={compact ? 28 : 36}
          priority
          src="/brand/logo-transparent.png"
          width={compact ? 28 : 36}
        />
      </div>
      <div className="min-w-0 flex flex-col">
        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.32em] text-accent", compact ? "hidden sm:block" : "")}>
          {topLabel}
        </span>
        <span
          className={cn(
            "mt-1 text-foreground",
            compact ? "text-sm font-medium" : "text-lg font-semibold tracking-[-0.03em]",
          )}
        >
          Omnia Creata
        </span>
        <span className={cn("mt-1 text-muted", compact ? "hidden md:block text-xs" : "text-sm")}>
          {compact ? "omniacreata.com" : subLabel}
        </span>
      </div>
    </Link>
  );
}
