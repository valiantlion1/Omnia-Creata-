"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { ProductRecord } from "@/content/products";
import type { LocaleCode } from "@/i18n/config";
import { withLocalePrefix } from "@/lib/utils";

type HQHeroSceneProps = {
  products: ProductRecord[];
  locale: LocaleCode;
};

export function HQHeroScene({ products, locale }: HQHeroSceneProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const scene = node;

    function update(event: MouseEvent) {
      const bounds = scene.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      scene.style.setProperty("--scene-x", `${x * 12}px`);
      scene.style.setProperty("--scene-y", `${y * 12}px`);
    }

    function reset() {
      scene.style.setProperty("--scene-x", "0px");
      scene.style.setProperty("--scene-y", "0px");
    }

    scene.addEventListener("mousemove", update);
    scene.addEventListener("mouseleave", reset);

    return () => {
      scene.removeEventListener("mousemove", update);
      scene.removeEventListener("mouseleave", reset);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[620px] overflow-hidden rounded-[36px] border border-[rgba(217,181,109,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] [perspective:1400px]"
      style={
        {
          "--scene-x": "0px",
          "--scene-y": "0px",
        } as CSSProperties
      }
    >
      <div className="hero-haze ambient-pulse left-4 top-10 h-44 w-44 bg-[rgba(217,181,109,0.22)]" />
      <div className="hero-haze ambient-drift bottom-10 right-4 h-48 w-48 bg-[rgba(255,255,255,0.08)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,181,109,0.16),transparent_38%)]" />

      <div
        className="relative z-10 grid h-full grid-rows-[auto_1fr_auto] gap-4 p-6 sm:p-8"
      >
        <div
          className="rounded-[28px] border border-[rgba(217,181,109,0.16)] bg-black/30 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          style={{
            transform:
              "translate3d(calc(var(--scene-x) * -0.34), calc(var(--scene-y) * -0.34), 0) rotateX(calc(var(--scene-y) * -0.1)) rotateY(calc(var(--scene-x) * 0.1))",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[70%]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Product headquarters
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                Navigate products, platform access, and the Omnia Creata ecosystem from one central website.
              </p>
            </div>
            <div className="rounded-[18px] border border-[rgba(217,181,109,0.2)] bg-black/40 p-2.5">
              <Image
                alt="Omnia Creata emblem"
                className="h-auto w-[92px] object-contain opacity-90"
                height={48}
                priority
                src="/brand/logo-transparent.png"
                width={92}
              />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.24em] text-muted">
              Unified product access
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.24em] text-muted">
              Web, iOS, Android, PWA, desktop
            </div>
          </div>
        </div>

        <div
          className="grid content-end gap-4 md:grid-cols-2"
          style={{
            transform:
              "translate3d(calc(var(--scene-x) * 0.28), calc(var(--scene-y) * 0.2), 0)",
          }}
        >
          {products.slice(0, 2).map((product, index) => (
            <Link
              key={product.slug}
              className="rounded-[28px] border border-white/8 bg-black/35 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.24)]"
              href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
              style={{
                transform:
                  index === 0
                    ? "translate3d(calc(var(--scene-x) * -0.3), calc(var(--scene-y) * -0.3), 0)"
                    : "translate3d(calc(var(--scene-x) * 0.3), calc(var(--scene-y) * 0.2), 0)",
              }}
            >
              <p className="text-xl font-semibold text-foreground">{product.name}</p>
              <p className="mt-2 text-sm leading-6 text-foreground-soft">{product.shortDescription}</p>
            </Link>
          ))}
        </div>

        <div
          className="grid gap-3 md:grid-cols-3"
          style={{
            transform:
              "translate3d(calc(var(--scene-x) * 0.16), calc(var(--scene-y) * 0.16), 0)",
          }}
        >
          {products.slice(2, 5).map((product) => (
            <Link
              key={product.slug}
              className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-foreground-soft transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.22)]"
              href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
            >
              <p className="font-medium text-foreground">{product.name}</p>
              <p className="mt-2 leading-6">{product.shortDescription}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
