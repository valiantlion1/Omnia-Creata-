import type { HTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
}

export function EmptyState({ className, description, title, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-line/80 bg-surface/60 p-8 text-center",
        className
      )}
      {...props}
    >
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
