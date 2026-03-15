import type { InputHTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-line/70 bg-surface/80 px-4 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent/50 focus:bg-panel",
        className
      )}
      {...props}
    />
  );
}
