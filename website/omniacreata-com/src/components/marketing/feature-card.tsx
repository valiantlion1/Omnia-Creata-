type FeatureCardProps = {
  title: string;
  description: string;
  index?: string;
};

export function FeatureCard({ title, description, index }: FeatureCardProps) {
  return (
    <div className="soft-panel rounded-[30px] p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-[rgba(217,181,109,0.3)] to-transparent" />
        {index ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
            {index}
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-foreground-soft">{description}</p>
    </div>
  );
}
