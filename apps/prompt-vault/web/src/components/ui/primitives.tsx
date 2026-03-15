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
          "border-[color:rgba(255,255,255,0.14)] bg-[linear-gradient(135deg,var(--accent-strong),var(--accent))] px-4 text-[var(--accent-foreground)] shadow-[var(--shadow-glow)] before:absolute before:inset-x-3 before:top-[1px] before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.46),transparent)] before:content-[''] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95",
        variant === "secondary" &&
          "border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-4 text-[var(--text-primary)] shadow-[var(--shadow-panel)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] active:translate-y-0",
        variant === "ghost" &&
          "border-transparent bg-transparent px-3 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-muted)]",
        variant === "danger" &&
          "border-transparent bg-[linear-gradient(135deg,var(--danger),#b34840)] px-4 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:opacity-95",
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
        "h-11 w-full rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] px-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-inset)] backdrop-blur-xl outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)] focus:ring-2 focus:ring-[var(--accent-soft)]",
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
        "min-h-[120px] w-full rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-inset)] backdrop-blur-xl outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)] focus:ring-2 focus:ring-[var(--accent-soft)]",
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
        "h-11 w-full appearance-none rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] px-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-inset)] backdrop-blur-xl outline-none hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)] focus:ring-2 focus:ring-[var(--accent-soft)]",
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
        "relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34),transparent)]",
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
          "border-transparent bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        tone === "accent" &&
          "border-[color:rgba(205,160,96,0.22)] bg-[linear-gradient(180deg,rgba(205,160,96,0.14),rgba(205,160,96,0.07))] text-[var(--accent-strong)]",
        tone === "success" &&
          "border-[color:rgba(185,159,113,0.2)] bg-[color:rgba(110,86,44,0.14)] text-[var(--success)]",
        tone === "warning" &&
          "border-[color:rgba(227,182,109,0.2)] bg-[color:rgba(139,99,42,0.14)] text-[var(--warning)]",
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
