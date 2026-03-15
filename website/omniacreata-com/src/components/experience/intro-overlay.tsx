"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Phase = "hidden" | "enter" | "exit";

export function IntroOverlay() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const exitDelay = reducedMotion ? 280 : 1500;
    const hideDelay = reducedMotion ? 640 : 2250;

    const enterTimer = window.setTimeout(() => setPhase("enter"), 16);
    const exitTimer = window.setTimeout(() => setPhase("exit"), exitDelay);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), hideDelay);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "intro-overlay fixed inset-0 z-[90] flex items-center justify-center bg-black",
        phase === "enter" && "is-enter",
        phase === "exit" && "is-exit",
      )}
    >
      <div className="intro-overlay__veil absolute inset-0" />
      <div className="intro-overlay__core relative text-center">
        <div className="mx-auto w-[220px] rounded-[26px] border border-[rgba(217,181,109,0.28)] bg-black/55 p-5 backdrop-blur-xl sm:w-[260px]">
          <Image
            alt="Omnia Creata logo"
            className="h-auto w-full object-contain"
            height={200}
            priority
            src="/brand/logo-transparent.png"
            width={240}
          />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.44em] text-accent">
          Omnia Creata
        </p>
      </div>
    </div>
  );
}
