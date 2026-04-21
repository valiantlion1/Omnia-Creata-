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
        centered ? "mx-auto max-w-3xl text-center" : "max-w-[38rem] text-left",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
        {eyebrow}
      </p>
      <h2 className="text-[2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-foreground sm:text-[2.7rem]">
        {title}
      </h2>
      <p className="text-[15px] leading-7 text-foreground-soft sm:text-base sm:leading-8">
        {description}
      </p>
    </div>
  );
}
