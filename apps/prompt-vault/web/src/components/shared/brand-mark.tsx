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
      <div className="relative overflow-hidden rounded-[20px] border border-[color:rgba(205,160,96,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-2.5 py-2 shadow-[var(--shadow-panel)] before:pointer-events-none before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)]">
        <Image
          alt="Omnia Creata"
          className={cn("h-8 w-auto object-contain", compact && "h-7")}
          height={260}
          src="/omnia-creata-logo.svg"
          width={640}
        />
      </div>
      {compact ? (
        <div className="hidden text-sm font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:block">
          Prompt Vault
        </div>
      ) : (
        <div className="space-y-0.5">
          <div className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            Prompt Vault
          </div>
          <div className="text-[11px] font-medium text-[var(--text-tertiary)]">
            by Omnia Creata
          </div>
        </div>
      )}
    </div>
  );
}
