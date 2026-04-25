import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/* ─── Button ─── */
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
        "vault-press relative inline-flex items-center justify-center gap-2 rounded-[16px] text-[13px] font-semibold tracking-[-0.01em] outline-none disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-strong)]",
        variant === "secondary" &&
          "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-strong)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        variant === "danger" &&
          "border border-red-500/20 bg-red-500/8 text-[var(--danger)] hover:bg-red-500/14",
        size === "sm" && "h-9 px-3 text-xs",
        size === "default" && "h-11 px-4.5",
        size === "lg" && "h-12 px-5 text-[14px]",
        className
      )}
      {...props}
    />
  );
}

/* ─── Input ─── */
export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

/* ─── Textarea ─── */
export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none",
        className
      )}
      {...props}
    />
  );
}

/* ─── Select ─── */
export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full appearance-none rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

/* ─── Surface ─── */
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
        "rounded-[26px] border border-[var(--border)] bg-[var(--surface-strong)] transition-colors duration-[var(--motion-fast)] shadow-[var(--shadow-soft)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Badge ─── */
export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "default" &&
          "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        tone === "accent" &&
          "border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
        tone === "success" &&
          "border border-emerald-500/15 bg-emerald-500/10 text-emerald-400",
        tone === "warning" &&
          "border border-amber-500/15 bg-amber-500/10 text-amber-400",
        tone === "info" &&
        "border border-[var(--accent-secondary-soft)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-strong)]",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ─── SectionHeading ─── */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-2", align === "center" && "text-center")}>
      {eyebrow ? (
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ─── EmptyState ─── */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)]">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

/* ─── Field ─── */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs text-[var(--text-tertiary)]">{hint}</span>
      ) : null}
    </label>
  );
}
