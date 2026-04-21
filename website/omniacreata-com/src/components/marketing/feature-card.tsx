type FeatureCardProps = {
  title: string;
  description: string;
  index?: string;
};

export function FeatureCard({ title, description, index }: FeatureCardProps) {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(20,27,36,0.82),rgba(12,17,24,0.92))] p-6 shadow-[0_20px_56px_rgba(3,10,18,0.18)]">
      <div className="flex items-center justify-between gap-4">
        {index ? (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            {index}
          </span>
        ) : null}
        <span className="h-px flex-1 bg-gradient-to-r from-white/[0.14] to-transparent" />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-foreground-soft">{description}</p>
    </div>
  );
}
