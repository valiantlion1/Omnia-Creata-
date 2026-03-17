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
  const studio = products[0];
  const sideProducts = products.slice(1);
  const labels: Record<string, string> = {
    "omnia-creata-studio": "Flagship workspace",
    omniapixels: "Visual product",
    omniaorganizer: "Operations",
    "prompt-vault": "Prompt library",
    "omnia-watch": "Monitoring",
  };

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
      className="relative h-full min-h-[620px] overflow-hidden rounded-[40px] border border-[rgba(217,181,109,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01)),rgba(8,8,8,0.92)] [perspective:1400px]"
      style={
        {
          "--scene-x": "0px",
          "--scene-y": "0px",
        } as CSSProperties
      }
    >
      <div className="hero-haze ambient-pulse left-[-5%] top-[6%] h-56 w-56 bg-[rgba(217,181,109,0.22)]" />
      <div className="hero-haze ambient-drift bottom-[-6%] right-[-4%] h-64 w-64 bg-[rgba(255,255,255,0.08)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/brand/hero-texture.png')] bg-cover bg-center opacity-[0.05] mix-blend-screen" />
      <div className="pointer-events-none absolute inset-[6%] rounded-[32px] border border-white/8" />
      <div
        className="pointer-events-none absolute left-[10%] top-[12%] h-[44%] w-[56%] rounded-[34px] border border-[rgba(217,181,109,0.14)]"
        style={{
          transform:
            "translate3d(calc(var(--scene-x) * -0.2), calc(var(--scene-y) * -0.2), 0) rotate(-7deg)",
        }}
      />
      <div
        className="pointer-events-none absolute right-[8%] top-[14%] h-[38%] w-[34%] rounded-[30px] border border-white/8"
        style={{
          transform:
            "translate3d(calc(var(--scene-x) * 0.18), calc(var(--scene-y) * 0.18), 0) rotate(8deg)",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,181,109,0.14),transparent_42%)]" />

      <div className="relative z-10 grid h-full gap-5 p-6 sm:p-8">
        <div
          className="ml-auto w-fit rounded-full border border-white/10 bg-black/30 px-3 py-2 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          style={{
            transform:
              "translate3d(calc(var(--scene-x) * -0.18), calc(var(--scene-y) * -0.18), 0)",
          }}
        >
          <Image
            alt="Omnia Creata emblem"
            className="h-auto w-[62px] object-contain opacity-90"
            height={34}
            priority
            src="/brand/logo-transparent.png"
            width={62}
          />
        </div>

        <div
          className="grid flex-1 gap-5 xl:grid-cols-[1.12fr_0.88fr]"
          style={{
            transform:
              "translate3d(calc(var(--scene-x) * 0.18), calc(var(--scene-y) * 0.14), 0)",
          }}
        >
          <Link
            className="flex min-h-[380px] flex-col justify-between rounded-[34px] border border-[rgba(217,181,109,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),rgba(10,10,10,0.84)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.42)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.24)] sm:p-7"
            href={withLocalePrefix(locale, `/products/${studio.slug}`) as Route}
            style={{
              transform:
                "translate3d(calc(var(--scene-x) * -0.28), calc(var(--scene-y) * -0.24), 0)",
            }}
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[rgba(217,181,109,0.18)] bg-[rgba(217,181,109,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                  Central access
                </span>
                <span className="text-[11px] uppercase tracking-[0.24em] text-muted">
                  Web, PWA, desktop
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
                  {labels[studio.slug]}
                </p>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.4rem]">
                  {studio.name}
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-foreground-soft sm:text-[15px]">
                  {studio.shortDescription}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.22em] text-muted">
                  Five flagship products
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.22em] text-muted">
                  Direct public routes
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/8 pt-4 text-sm">
                <span className="text-foreground-soft">Open the flagship workspace</span>
                <span className="text-accent">View Studio</span>
              </div>
            </div>
          </Link>

          <div className="flex flex-col justify-end gap-3">
            {sideProducts.map((product, index) => (
              <Link
                key={product.slug}
                className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01)),rgba(10,10,10,0.74)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.2)]"
                href={withLocalePrefix(locale, `/products/${product.slug}`) as Route}
                style={{
                  transform: `translate3d(calc(var(--scene-x) * ${0.12 + index * 0.04}), calc(var(--scene-y) * ${0.1 + index * 0.03}), 0)`,
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      {labels[product.slug]}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      {product.name}
                    </p>
                  </div>
                  <span className="text-sm text-foreground-soft">+</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div
          className="grid gap-3 md:grid-cols-[1fr_auto]"
          style={{
            transform:
              "translate3d(calc(var(--scene-x) * 0.14), calc(var(--scene-y) * 0.14), 0)",
          }}
        >
          <div className="rounded-[24px] border border-white/8 bg-black/28 px-5 py-4 text-sm leading-7 text-foreground-soft">
            One public website for products, platform access, pricing, and company contact.
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-[24px] border border-[rgba(217,181,109,0.18)] bg-[rgba(217,181,109,0.08)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-accent transition hover:border-[rgba(217,181,109,0.28)] hover:bg-[rgba(217,181,109,0.12)]"
            href={withLocalePrefix(locale, "/products") as Route}
          >
            Explore products
          </Link>
        </div>
      </div>
    </div>
  );
}
