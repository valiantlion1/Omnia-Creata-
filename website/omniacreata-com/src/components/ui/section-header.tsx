import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "space-y-4",
        centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl text-left",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="text-base leading-8 text-foreground-soft sm:text-lg">
        {description}
      </p>
    </div>
  );
}
