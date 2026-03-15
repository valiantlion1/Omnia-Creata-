import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
  {
    defaultVariants: {
      tone: "neutral"
    },
    variants: {
      tone: {
        critical: "border-danger/30 bg-danger/10 text-danger",
        neutral: "border-line/70 bg-surface/80 text-text",
        positive: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning"
      }
    }
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
