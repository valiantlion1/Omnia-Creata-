import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@omnia-watch/utils";

export interface SectionHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}

export function SectionHeading({
  className,
  description,
  eyebrow,
  title,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", className)} {...props}>
      {eyebrow ? (
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
        {title}
      </h2>
      {description ? <p className="mt-4 text-base leading-7 text-muted">{description}</p> : null}
    </div>
  );
}
