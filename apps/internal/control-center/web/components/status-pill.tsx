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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.24em]",
        tone === "healthy" && "border-teal-300/30 bg-teal-300/12 text-teal-100",
        tone === "degraded" && "border-amber-300/30 bg-amber-300/12 text-amber-100",
        tone === "failed" && "border-rose-300/30 bg-rose-300/12 text-rose-100",
        tone === "open" && "border-orange-300/30 bg-orange-300/12 text-orange-100",
        tone === "resolved" && "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
        tone === "muted" && "border-white/20 bg-white/8 text-white/70"
      )}
    >
      {children}
    </span>
  );
}
