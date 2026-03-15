import type { HTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";
import { Badge } from "./badge";
import { Card } from "./card";

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  label: string;
  trend?: string;
  value: string;
}

export function StatCard({
  className,
  eyebrow,
  label,
  trend,
  value,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn("flex min-h-36 flex-col justify-between", className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-3 font-display text-3xl font-semibold text-text">{value}</p>
        </div>
        {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      </div>
      {trend ? <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">{trend}</p> : null}
    </Card>
  );
}
