import type { HTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line/70 bg-surface/90 p-6 shadow-ambient backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-text", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted", className)} {...props} />;
}
