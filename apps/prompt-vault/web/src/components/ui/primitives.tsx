import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "default" | "lg";
}) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border text-[13px] font-semibold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "border border-[color:rgba(255,255,255,0.15)] bg-gradient-to-br from-[var(--accent-strong)] to-[var(--accent)] px-4 text-[#000000] shadow-[var(--shadow-glow)] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent before:content-[''] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:brightness-95",
        variant === "secondary" &&
          "border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[var(--text-primary)] shadow-[var(--shadow-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] active:bg-[var(--surface-muted)]",
        variant === "ghost" &&
          "border-transparent bg-transparent px-3 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-muted)] text-[13px] font-medium",
        variant === "danger" &&
          "border-transparent bg-red-500/10 border border-red-500/20 px-4 text-red-500 hover:bg-red-500/20 hover:text-red-400",
        size === "sm" && "h-11 px-3.5 text-xs",
        size === "default" && "h-11 px-4.5",
        size === "lg" && "h-12 px-5 text-base",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-inset)] outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)] focus:ring-1 focus:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-inset)] outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)] focus:ring-1 focus:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-inset)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)] focus:ring-1 focus:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

export function Surface({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)] backdrop-blur-3xl ring-1 ring-inset ring-white/5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  className
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "success" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.01em]",
        tone === "default" &&
          "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        tone === "accent" &&
          "border-[color:rgba(212,175,55,0.3)] bg-[color:rgba(212,175,55,0.1)] text-[var(--accent-strong)] shadow-[0_0_12px_rgba(212,175,55,0.15)]",
        tone === "success" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        tone === "warning" &&
          "border-amber-500/20 bg-amber-500/10 text-amber-400",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-3", align === "center" && "text-center")}>
      {eyebrow ? (
        <div className="inline-flex rounded-full border border-[color:rgba(212,167,91,0.18)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
          {eyebrow}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] md:text-[1.75rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] md:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  className
}: {
  label: string;
  value: string | number;
  detail?: string;
  className?: string;
}) {
  return (
    <Surface className={cn("space-y-4 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          {label}
        </p>
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_18px_rgba(212,167,91,0.45)]" />
      </div>
      <div className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] md:text-[2rem]">
        {value}
      </div>
      {detail ? <p className="text-xs leading-6 text-[var(--text-tertiary)]">{detail}</p> : null}
    </Surface>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Surface className="flex min-h-[260px] flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:rgba(212,167,91,0.18)] bg-[var(--accent-soft)] shadow-[var(--shadow-glow)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-strong)]" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mx-auto max-w-lg text-sm leading-7 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {action}
    </Surface>
  );
}

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2.5">
      <span className="block text-sm font-medium tracking-[-0.01em] text-[var(--text-primary)]">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs text-[var(--text-tertiary)]">{hint}</span> : null}
    </label>
  );
}
