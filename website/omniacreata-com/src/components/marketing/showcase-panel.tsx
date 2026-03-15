type ShowcasePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
};

export function ShowcasePanel({
  eyebrow,
  title,
  description,
  points,
}: ShowcasePanelProps) {
  return (
    <div className="luxury-panel rounded-[32px] p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
            {eyebrow}
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
            {title}
          </h3>
          <p className="text-sm leading-7 text-foreground-soft sm:text-base">
            {description}
          </p>
          <ul className="space-y-3 pt-2">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm leading-7 text-foreground-soft"
              >
                <span className="mt-2 h-2 w-2 rounded-full bg-accent" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-[rgba(217,181,109,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.2)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(217,181,109,0.45)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.1)]" />
          </div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[22px] border border-white/8 bg-black/35 p-4">
              <div className="h-2 w-24 rounded-full bg-white/12" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="h-2 w-20 rounded-full bg-[rgba(217,181,109,0.32)]" />
                  <div className="mt-5 h-16 rounded-[20px] bg-[linear-gradient(135deg,rgba(217,181,109,0.16),rgba(255,255,255,0.04))]" />
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="h-2 w-16 rounded-full bg-white/14" />
                  <div className="mt-5 space-y-3">
                    <div className="h-3 rounded-full bg-white/8" />
                    <div className="h-3 w-4/5 rounded-full bg-white/8" />
                    <div className="h-3 w-3/5 rounded-full bg-white/8" />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {points.slice(0, 3).map((point) => (
                <div
                  key={point}
                  className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-5"
                >
                  <div className="h-2 w-12 rounded-full bg-[rgba(217,181,109,0.28)]" />
                  <div className="mt-4 text-sm leading-6 text-foreground-soft">{point}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
