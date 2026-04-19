import clsx from "clsx";

export function StatusPill({
  tone,
  children
}: {
  tone: "healthy" | "degraded" | "failed" | "open" | "resolved" | "muted";
  children: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        tone === "healthy" && "border-[rgba(31,122,91,0.18)] bg-[rgba(31,122,91,0.08)] text-[var(--ocos-success)]",
        tone === "degraded" && "border-[rgba(155,107,22,0.18)] bg-[rgba(155,107,22,0.08)] text-[var(--ocos-warn)]",
        tone === "failed" && "border-[rgba(160,68,68,0.18)] bg-[rgba(160,68,68,0.08)] text-[var(--ocos-danger)]",
        tone === "open" && "border-[rgba(23,107,102,0.18)] bg-[rgba(23,107,102,0.08)] text-[var(--ocos-accent)]",
        tone === "resolved" && "border-[rgba(31,122,91,0.18)] bg-[rgba(31,122,91,0.06)] text-[var(--ocos-success)]",
        tone === "muted" && "border-[var(--ocos-line)] bg-white/62 text-[var(--ocos-muted)]"
      )}
    >
      {children}
    </span>
  );
}
