import Image from "next/image";
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
        "studio-scene studio-scene--image",
        variant === "product" && "studio-scene--product",
        variant === "compact" && "studio-scene--compact",
        className,
      )}
    >
      <Image
        alt="OmniaCreata Studio visual workspace"
        className="studio-scene__image"
        fill
        sizes="(max-width: 1024px) 100vw, 52vw"
        src="/images/omnia-home-hero-art-v1.png"
      />
    </div>
  );
}
