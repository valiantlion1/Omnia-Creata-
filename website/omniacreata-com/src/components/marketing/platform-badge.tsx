import type { PlatformKey } from "@/content/platforms";

type PlatformBadgeProps = {
  platform: PlatformKey;
};

const platformLabels: Record<PlatformKey, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  pwa: "PWA",
  desktop: "Desktop",
};

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground-soft">
      {platformLabels[platform]}
    </span>
  );
}
