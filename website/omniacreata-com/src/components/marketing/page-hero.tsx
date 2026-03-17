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
    <section className="relative overflow-hidden px-6 pb-10 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="luxury-panel gold-outline relative overflow-hidden rounded-[40px] px-7 py-10 sm:px-10 sm:py-12 lg:px-12">
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.05] mix-blend-screen"
            fill
            priority
            src="/brand/hero-texture.png"
          />
          <div className="hero-haze ambient-drift -left-16 top-4 h-56 w-56 bg-[rgba(217,181,109,0.18)]" />
          <div className="hero-haze ambient-pulse bottom-[-4%] right-[-2%] h-52 w-52 bg-[rgba(255,255,255,0.08)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <Reveal className="relative">
              <div className="max-w-4xl space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">
                  {eyebrow}
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl lg:text-[4.6rem]">
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
              <div className="relative mx-auto max-w-[460px] space-y-4">
                <div className="soft-panel rounded-[32px] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-[20px] border border-[rgba(217,181,109,0.18)] bg-black/40 p-3">
                      <Image
                        alt="Omnia Creata logo"
                        className="h-auto w-[54px] object-contain"
                        height={54}
                        priority
                        src="/brand/logo-transparent.png"
                        width={54}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        {isTurkish ? "Resmi public site" : "Official public website"}
                      </p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        omniacreata.com
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground-soft">
                        {isTurkish
                          ? "Urunler, fiyatlandirma ve iletisim tek merkezde toplanir."
                          : "Products, pricing, and contact stay organized in one public destination."}
                      </p>
                    </div>
                  </div>
                </div>

                {!!meta.length && (
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {meta.map((item) => (
                      <div
                        key={item.label}
                        className="soft-panel rounded-[26px] px-5 py-4"
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-muted">{item.label}</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
