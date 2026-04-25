import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-4 shadow-[var(--shadow-soft)] after:pointer-events-none after:absolute after:right-[-8%] after:top-[-28%] after:h-40 after:w-40 after:rounded-full after:bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)] md:flex md:items-end md:justify-between md:p-5">
      <div className="relative z-10 space-y-2.5">
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)] md:text-[1.7rem]">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] md:text-[15px]">
          {subtitle}
        </p>
      </div>
      {actions ? (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
