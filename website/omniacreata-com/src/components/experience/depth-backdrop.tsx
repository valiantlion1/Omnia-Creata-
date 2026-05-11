import type { CSSProperties } from "react";

export function DepthBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="depth-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-motion="light"
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
    </div>
  );
}
