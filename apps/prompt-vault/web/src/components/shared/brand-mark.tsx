import { brand } from "@prompt-vault/config";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-start",
          compact ? "h-11 w-[54px]" : "h-12 w-[62px]"
        )}
      >
        <Image
          alt={brand.parent}
          className="h-full w-full object-contain object-left"
          decoding="async"
          height={100}
          sizes={compact ? "54px" : "62px"}
          src="/brand/omnia-creata-logo-transparent.png"
          width={124}
        />
      </div>
      {compact ? (
        <div className="leading-none">
          <div className="font-display text-[15px] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            {brand.name}
          </div>
          <div className="mt-1 text-[10px] font-medium text-[var(--text-tertiary)]">
            by {brand.parent}
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="font-display text-base font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            {brand.name}
          </div>
          <div className="text-[10px] font-medium text-[var(--text-tertiary)]">
            by {brand.parent}
          </div>
        </div>
      )}
    </div>
  );
}
