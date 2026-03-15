import type { HTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";
import { Badge } from "./badge";

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description: string;
}

export function Callout({ className, description, eyebrow, title, ...props }: CalloutProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line/70 bg-panel/60 p-5 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {eyebrow ? <Badge className="mb-3">{eyebrow}</Badge> : null}
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
