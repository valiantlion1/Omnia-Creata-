import { ButtonLink } from "@/components/ui/button";

type PricingCardProps = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  ctaHref: string;
  ctaLabel: string;
  featured?: boolean;
};

export function PricingCard({
  name,
  price,
  cadence,
  description,
  features,
  ctaHref,
  ctaLabel,
  featured = false,
}: PricingCardProps) {
  return (
    <div
      className={`luxury-panel rounded-[32px] p-7 ${featured ? "gold-outline" : ""}`}
    >
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">{name}</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
            {price}
          </span>
          {cadence ? <span className="pb-1 text-sm text-muted">{cadence}</span> : null}
        </div>
        <p className="text-sm leading-7 text-foreground-soft">{description}</p>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-7 text-foreground-soft">
            <span className="mt-2 h-2 w-2 rounded-full bg-accent" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <ButtonLink
        className="mt-8 w-full"
        href={ctaHref}
        size="lg"
        variant={featured ? "primary" : "secondary"}
      >
        {ctaLabel}
      </ButtonLink>
    </div>
  );
}
