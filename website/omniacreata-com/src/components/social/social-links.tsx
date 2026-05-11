import { getSocialProfiles } from "@/content/social";
import { cn } from "@/lib/utils";

type SocialLinksProps = {
  className?: string;
  compact?: boolean;
  locale: string;
};

export function SocialLinks({ className, compact = false, locale }: SocialLinksProps) {
  const isTurkish = locale === "tr";
  const profiles = getSocialProfiles();

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {profiles.map((profile) => {
        const label = compact ? profile.label : `${profile.label} ${profile.handle}`;
        const commonClasses = cn(
          "inline-flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm transition",
          profile.available
            ? "border-[rgba(216,181,109,0.34)] text-foreground hover:border-[rgba(243,223,174,0.58)] hover:bg-white/[0.05]"
            : "cursor-default border-white/10 text-muted",
        );

        const content = (
          <>
            <span className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              {profile.id === "instagram" ? "IG" : "X"}
            </span>
            <span>{label}</span>
            {!profile.available ? (
              <span className="text-xs text-muted">
                {isTurkish ? "yakinda" : "soon"}
              </span>
            ) : null}
          </>
        );

        if (!profile.available) {
          return (
            <span
              aria-label={`${profile.label} ${isTurkish ? "linki hazirlaniyor" : "link pending"}`}
              className={commonClasses}
              key={profile.id}
            >
              {content}
            </span>
          );
        }

        return (
          <a
            aria-label={profile.ariaLabel}
            className={commonClasses}
            href={profile.href}
            key={profile.id}
            rel="noopener noreferrer"
            target="_blank"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
