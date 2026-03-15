import Image from "next/image";
import type { LocaleCode } from "@/i18n/config";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

type HeroAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  locale?: LocaleCode;
  actions?: HeroAction[];
  meta?: Array<{ label: string; value: string }>;
};

export function PageHero({
  eyebrow,
  title,
  description,
  locale = "en",
  actions = [],
  meta = [],
}: PageHeroProps) {
  const isTurkish = locale === "tr";

  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="luxury-panel gold-outline relative overflow-hidden rounded-[36px] px-8 py-14 sm:px-12 sm:py-16">
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.08] mix-blend-screen"
            fill
            priority
            src="/brand/hero-texture.png"
          />
          <div className="hero-haze ambient-drift -left-16 top-6 h-56 w-56 bg-[rgba(217,181,109,0.18)]" />
          <div className="hero-haze ambient-pulse bottom-0 right-4 h-48 w-48 bg-[rgba(255,255,255,0.08)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <Reveal className="relative">
              <div className="max-w-4xl space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                  {eyebrow}
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-foreground-soft sm:text-lg">
                  {description}
                </p>

                {!!actions.length && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {actions.map((action) => (
                      <ButtonLink
                        key={action.href}
                        href={action.href}
                        size="lg"
                        variant={action.variant ?? "primary"}
                      >
                        {action.label}
                      </ButtonLink>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal className="relative" delay={120}>
              <div className="relative mx-auto max-w-[440px]">
                <div className="hero-haze ambient-float left-8 top-14 h-40 w-40 bg-[rgba(217,181,109,0.18)]" />
                <div className="rounded-[30px] border border-[rgba(217,181,109,0.18)] bg-black/40 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    {isTurkish ? "Resmi public site" : "Official public website"}
                  </p>
                  <p className="mt-2 text-sm text-foreground-soft">omniacreata.com</p>
                  <div className="mt-5 rounded-[28px] border border-[rgba(217,181,109,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] px-4 py-5 sm:px-6 sm:py-6">
                    <Image
                      alt="Omnia Creata logo"
                      className="mx-auto h-auto w-full max-w-[280px] object-contain"
                      height={240}
                      priority
                      src="/brand/logo-transparent.png"
                      width={280}
                    />
                  </div>
                  <p className="mt-5 text-sm leading-7 text-foreground-soft">
                    {isTurkish
                      ? "Urunler, fiyatlandirma, iletisim ve hukuki erisim tek public yuzde toplanir."
                      : "Products, pricing, contact, and legal access are organized in one public surface."}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {!!meta.length && (
            <Reveal className="relative mt-10 grid gap-3 md:grid-cols-3" delay={180}>
              {meta.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-muted">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
