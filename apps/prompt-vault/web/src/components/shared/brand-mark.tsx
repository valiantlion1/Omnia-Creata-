import { brand } from "@prompt-vault/config";
import { cn } from "@/lib/cn";
import Image from "next/image";

export function BrandMark({
  className,
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="relative overflow-hidden rounded-[20px] border border-[color:rgba(242,202,80,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-3 py-2.5 shadow-[var(--shadow-panel)] before:pointer-events-none before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]">
        <Image
          alt={brand.parent}
          className={cn("h-8 w-auto object-contain", compact && "h-7")}
          height={260}
          src="/omnia-creata-logo.svg"
          width={640}
        />
      </div>
      {compact ? null : (
        <div className="space-y-0.5">
          <div className="font-display text-base font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            {brand.name}
          </div>
          <div className="text-[11px] font-medium text-[var(--text-tertiary)]">
            by {brand.parent}
          </div>
        </div>
      )}
    </div>
  );
}
