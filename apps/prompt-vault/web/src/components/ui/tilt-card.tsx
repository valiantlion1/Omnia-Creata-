"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export function TiltCard({
  children,
  className,
  depth = "soft"
}: {
  children: React.ReactNode;
  className?: string;
  depth?: "soft" | "medium";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;

    const onChange = (event: MediaQueryListEvent) => {
      reducedMotion.current = event.matches;
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function reset() {
    const node = ref.current;
    if (!node) {
      return;
    }

    node.dataset.tilting = "false";
    node.style.setProperty("--tilt-rotate-x", "0deg");
    node.style.setProperty("--tilt-rotate-y", "0deg");
    node.style.setProperty("--tilt-glow-x", "50%");
    node.style.setProperty("--tilt-glow-y", "50%");
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node || reducedMotion.current) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateRange = depth === "medium" ? 8 : 5;
    const rotateY = (x - 0.5) * rotateRange;
    const rotateX = (0.5 - y) * rotateRange;

    node.dataset.tilting = "true";
    node.style.setProperty("--tilt-rotate-x", `${rotateX.toFixed(2)}deg`);
    node.style.setProperty("--tilt-rotate-y", `${rotateY.toFixed(2)}deg`);
    node.style.setProperty("--tilt-glow-x", `${(x * 100).toFixed(1)}%`);
    node.style.setProperty("--tilt-glow-y", `${(y * 100).toFixed(1)}%`);
  }

  return (
    <div
      className={cn("interactive-tilt", depth === "medium" && "interactive-tilt-medium", className)}
      data-tilting="false"
      onPointerLeave={reset}
      onPointerMove={onPointerMove}
      ref={ref}
    >
      <div className="interactive-tilt__inner">{children}</div>
    </div>
  );
}
