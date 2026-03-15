import type { Dictionary } from "@omnia-watch/i18n";
import { Badge } from "@omnia-watch/ui";

export function DemoModeBanner({
  dictionary,
  mode
}: {
  dictionary: Dictionary;
  mode: string;
}) {
  const eyebrow =
    mode === "connected" ? dictionary.app.meta.liveMode : dictionary.app.meta.demoMode;
  const description =
    mode === "connected"
      ? dictionary.app.meta.connectedDetail
      : dictionary.common.demoModeDetail;

  return (
    <div className="rounded-[24px] border border-line/40 bg-canvas/55 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={mode === "connected" ? "positive" : "warning"}>{eyebrow}</Badge>
        <p className="text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}
