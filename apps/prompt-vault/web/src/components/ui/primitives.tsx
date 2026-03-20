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
        "vault-press relative inline-flex items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold tracking-[-0.01em] outline-none disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-gradient-to-b from-[var(--accent-strong)] to-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.3),var(--shadow-glow)] hover:brightness-110",
        variant === "secondary" &&
          "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
        variant === "danger" &&
          "border border-red-500/20 bg-red-500/8 text-[var(--danger)] hover:bg-red-500/14",
        size === "sm" && "h-9 px-3 text-xs",
        size === "default" && "h-11 px-4",
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
        "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]",
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
        "min-h-[120px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none",
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
        "h-11 w-full appearance-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]",
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
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] transition-colors duration-[var(--motion-fast)]",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone === "default" &&
          "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        tone === "accent" &&
          "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
        tone === "success" &&
          "bg-emerald-500/10 text-emerald-400",
        tone === "warning" &&
          "bg-amber-500/10 text-amber-400",
        tone === "info" &&
          "bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-strong)]",
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
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
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
