import type { HTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "accent" | "danger" | "success" | "warning";
  value: number;
}

const toneClasses = {
  accent: "bg-accent",
  danger: "bg-danger",
  success: "bg-success",
  warning: "bg-warning"
} as const;

export function ProgressBar({
  className,
  tone = "accent",
  value,
  ...props
}: ProgressBarProps) {
  return (
    <div
      className={cn("h-2 w-full rounded-full bg-panel/80", className)}
      role="progressbar"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(value)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-all", toneClasses[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
