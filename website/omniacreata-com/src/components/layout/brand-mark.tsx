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
  const isTurkish = locale === "tr";

  return (
    <Link
      className={cn("group inline-flex items-center gap-4", className)}
      href={withLocalePrefix(locale, "/") as Route}
    >
      <div
        className={cn(
          "relative overflow-hidden border border-[rgba(217,181,109,0.24)] bg-black/70 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition duration-300 group-hover:border-[rgba(217,181,109,0.42)] group-hover:shadow-[0_24px_56px_rgba(0,0,0,0.42)]",
          compact ? "h-12 w-[128px] rounded-[18px] px-2" : "h-[78px] w-[198px] rounded-[24px] px-3",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,181,109,0.2),transparent_58%)]" />
        <Image
          alt="Omnia Creata"
          className="relative z-10 h-full w-full object-contain py-1"
          height={compact ? 40 : 66}
          priority
          src="/brand/logo-transparent.png"
          width={compact ? 124 : 188}
        />
      </div>
      <div className={cn("min-w-0 flex-col", compact ? "hidden sm:flex" : "flex")}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-accent">
          {isTurkish ? "Resmi web sitesi" : "Official website"}
        </span>
        <span
          className={cn(
            "mt-1 text-foreground",
            compact ? "text-sm font-medium" : "text-lg font-semibold tracking-[-0.03em]",
          )}
        >
          omniacreata.com
        </span>
        {!compact ? (
          <span className="mt-1 text-sm text-muted">
            {isTurkish ? "Premium teknoloji markasi" : "Premium technology brand"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
