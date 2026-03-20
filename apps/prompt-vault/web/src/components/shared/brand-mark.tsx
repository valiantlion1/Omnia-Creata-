import { brand } from "@prompt-vault/config";
import { cn } from "@/lib/cn";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Gold accent dot */}
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--accent-soft)]">
        <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      </div>
      {compact ? (
        <span className="font-display text-[15px] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
          {brand.name}
        </span>
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
