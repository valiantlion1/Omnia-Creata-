type FeatureCardProps = {
  title: string;
  description: string;
  index?: string;
};

export function FeatureCard({ title, description, index }: FeatureCardProps) {
  return (
    <div className="luxury-panel rounded-[28px] p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
        {index ? (
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {index}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-7 text-foreground-soft">{description}</p>
    </div>
  );
}
