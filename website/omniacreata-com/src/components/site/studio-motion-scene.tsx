import { cn } from "@/lib/utils";

type StudioMotionSceneProps = {
  className?: string;
  variant?: "hero" | "product" | "compact";
};

export function StudioMotionScene({
  className,
  variant = "hero",
}: StudioMotionSceneProps) {
  return (
    <div
      className={cn(
        "studio-scene",
        variant === "product" && "studio-scene--product",
        variant === "compact" && "studio-scene--compact",
        className,
      )}
    >
      <div className="studio-scene__glow studio-scene__glow--left" />
      <div className="studio-scene__glow studio-scene__glow--right" />
      <div className="studio-scene__grain" />
      <div className="studio-scene__grid" />
      <div className="studio-scene__ring studio-scene__ring--outer" />
      <div className="studio-scene__ring studio-scene__ring--inner" />

      <div className="studio-scene__labelbar">
        <span>Studio</span>
        <span>Image work</span>
        <span>Direction</span>
      </div>

      <article className="studio-scene__panel studio-scene__panel--focus">
        <div className="studio-scene__art studio-scene__art--focus" />
        <div className="studio-scene__panel-meta">
          <span>Portrait study</span>
          <strong>Prompt / refs / selects</strong>
        </div>
      </article>

      <article className="studio-scene__panel studio-scene__panel--upper">
        <div className="studio-scene__art studio-scene__art--upper" />
        <div className="studio-scene__panel-meta studio-scene__panel-meta--small">
          <span>Editorial</span>
        </div>
      </article>

      <article className="studio-scene__panel studio-scene__panel--lower">
        <div className="studio-scene__art studio-scene__art--lower" />
        <div className="studio-scene__panel-meta studio-scene__panel-meta--small">
          <span>World</span>
        </div>
      </article>

      <div className="studio-scene__rail">
        <span>Prompts</span>
        <span>Runs</span>
        <span>Selects</span>
      </div>
    </div>
  );
}
