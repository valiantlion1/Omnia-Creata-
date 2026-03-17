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
      className={cn("group inline-flex items-center gap-3.5", className)}
      href={withLocalePrefix(locale, "/") as Route}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-[rgba(217,181,109,0.24)] bg-black/80 shadow-[0_18px_40px_rgba(0,0,0,0.34)] transition duration-300 group-hover:border-[rgba(217,181,109,0.38)] group-hover:shadow-[0_22px_52px_rgba(0,0,0,0.4)]",
          compact ? "h-11 w-11 rounded-[16px] p-2" : "h-14 w-14 rounded-[20px] p-2.5",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,181,109,0.2),transparent_58%)]" />
        <Image
          alt="Omnia Creata"
          className="relative z-10 h-full w-full object-contain"
          height={compact ? 28 : 36}
          priority
          src="/brand/logo-transparent.png"
          width={compact ? 28 : 36}
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
          Omnia Creata
        </span>
        <span className={cn("mt-1 text-muted", compact ? "text-xs" : "text-sm")}>
          omniacreata.com
        </span>
      </div>
    </Link>
  );
}
