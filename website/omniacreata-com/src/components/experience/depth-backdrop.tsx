"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

const POINTER_RANGE = 26;

export function DepthBackdrop() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const compactScreen = window.matchMedia("(max-width: 1024px)").matches;
    const lightweight = coarsePointer || compactScreen;

    if (reducedMotion) {
      node.dataset.motion = "reduced";
      node.style.setProperty("--depth-x", "0px");
      node.style.setProperty("--depth-y", "0px");
      node.style.setProperty("--depth-scroll", "0px");
      return;
    }

    node.dataset.motion = lightweight ? "light" : "full";

    let frameId = 0;

    const updatePointer = (clientX: number, clientY: number) => {
      const x = clientX / window.innerWidth - 0.5;
      const y = clientY / window.innerHeight - 0.5;
      const xRange = lightweight ? POINTER_RANGE * 0.4 : POINTER_RANGE;
      const yRange = lightweight ? POINTER_RANGE * 0.32 : POINTER_RANGE * 0.7;

      node.style.setProperty("--depth-x", `${(x * xRange).toFixed(2)}px`);
      node.style.setProperty("--depth-y", `${(y * yRange).toFixed(2)}px`);
    };

    const updateScroll = () => {
      const scrollDistance = window.scrollY * (lightweight ? 0.04 : 0.08);
      node.style.setProperty("--depth-scroll", `${Math.min(scrollDistance, 72).toFixed(2)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => updatePointer(event.clientX, event.clientY));
    };

    const onPointerLeave = () => {
      node.style.setProperty("--depth-x", "0px");
      node.style.setProperty("--depth-y", "0px");
    };

    const onScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateScroll);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    updateScroll();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="depth-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        {
          "--depth-x": "0px",
          "--depth-y": "0px",
          "--depth-scroll": "0px",
        } as CSSProperties
      }
    >
      <div className="depth-layer depth-layer-base" />
      <div className="depth-layer depth-layer-grid" />
      <div className="depth-layer depth-layer-glow-a" />
      <div className="depth-layer depth-layer-glow-b" />
      <div className="depth-layer depth-layer-sweep" />
      <div className="depth-layer depth-layer-noise" />
    </div>
  );
}
