"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@prompt-vault/types";
import { BrandMark } from "@/components/shared/brand-mark";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { localizeHref } from "@/lib/locale";
import {
  hasSeenSessionSplash,
  loadIntroState,
  markSessionSplashSeen,
  saveIntroState,
  type IntroStateRecord
} from "@/lib/storage";

type IntroStage = "booting" | "splash" | "welcome" | "auth" | "offers" | "app";

const copy = {
  en: {
    splashTag: "Creative system online",
    welcomeTitle: "A lighter place for the ideas you actually want to keep.",
    slides: [
      {
        title: "Capture before the thought disappears",
        body: "Save prompts, ideas, notes, research fragments, and project thoughts in seconds."
      },
      {
        title: "Organize without turning life into admin work",
        body: "Projects, categories, and tags stay close, but never overpower the writing surface."
      },
      {
        title: "Refine when it matters",
        body: "Come back later, grow the entry, version it, and reuse it instead of losing it."
      }
    ],
    authTitle: "Keep going the way you want",
    authBody:
      "Create an account for sync and future upgrades, or continue as a guest while the beta stays lightweight.",
    signIn: "Sign in",
    signUp: "Create account",
    continueGuest: "Continue as guest",
    offersTitle: "Start free, upgrade later",
    offersBody:
      "The beta stays fast and accessible first. Pro comes back with more room, no ads, and helper AI.",
    freeLabel: "Free beta",
    freeBody: "Capture, projects, local persistence, and the core workflow.",
    proLabel: "Pro later",
    proBody: "No ads, bigger limits, and AI-assisted cleanup when V1 lands.",
    continueToApp: "Enter the app",
    next: "Next",
    back: "Back",
    skip: "Skip intro"
  },
  tr: {
    splashTag: "Yaratici sistem hazir",
    welcomeTitle: "Gercekten saklamak isteyecegin fikirler icin daha hafif bir alan.",
    slides: [
      {
        title: "Dusunce kaybolmadan yakala",
        body: "Promptlari, fikirleri, notlari, arastirma kirintilarini ve proje dusuncelerini saniyeler icinde kaydet."
      },
      {
        title: "Duzeni yonetim isine cevirmeden kur",
        body: "Projeler, kategoriler ve etiketler yakinda kalir ama yazma alanini asla bogmaz."
      },
      {
        title: "Gerektiginde geri donup gelistir",
        body: "Kayda sonra tekrar don, buyut, versiyonla ve kaybetmek yerine yeniden kullan."
      }
    ],
    authTitle: "Istegin sekilde devam et",
    authBody:
      "Sync ve ilerideki gelismeler icin hesap olustur ya da beta hafif kalirken misafir olarak devam et.",
    signIn: "Giris yap",
    signUp: "Hesap olustur",
    continueGuest: "Misafir devam et",
    offersTitle: "Ucretsiz basla, sonra yukselt",
    offersBody:
      "Beta once hizli ve erisilebilir kalir. Pro, daha fazla alan, reklamsiz deneyim ve yardimci AI ile V1'de gelir.",
    freeLabel: "Ucretsiz beta",
    freeBody: "Capture, projeler, lokal kalicilik ve temel calisma akisi.",
    proLabel: "Pro sonra",
    proBody: "Reklamsiz kullanim, daha yuksek limitler ve V1 ile AI destekli duzenleme.",
    continueToApp: "Uygulamaya gir",
    next: "Ileri",
    back: "Geri",
    skip: "Tanitim atla"
  }
} as const;

function resolveStage(state: IntroStateRecord, hasUser: boolean) {
  if (state.hasCompletedIntro) {
    return "app" as const;
  }

  if (!state.hasSeenWelcome) {
    return "welcome" as const;
  }

  if (!hasUser && !state.authDeferred) {
    return "auth" as const;
  }

  if (!state.hasSeenOffers) {
    return "offers" as const;
  }

  return "app" as const;
}

export function IntroGate({
  children,
  locale,
  hasUser
}: {
  children: ReactNode;
  locale: Locale;
  hasUser: boolean;
}) {
  const text = copy[locale];
  const [introState, setIntroState] = useState<IntroStateRecord>(() => loadIntroState());
  const [stage, setStage] = useState<IntroStage>(() =>
    hasSeenSessionSplash() ? resolveStage(loadIntroState(), hasUser) : "splash"
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const isLastSlide = slideIndex === text.slides.length - 1;

  useEffect(() => {
    if (stage !== "splash") {
      return;
    }

    markSessionSplashSeen();

    const timeout = window.setTimeout(() => {
      setStage(resolveStage(introState, hasUser));
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [hasUser, introState, stage]);

  function commitState(nextState: IntroStateRecord, nextStage: IntroStage) {
    setIntroState(nextState);
    saveIntroState(nextState);
    setStage(nextStage);
  }

  const dots = useMemo(
    () =>
      text.slides.map((slide, index) => (
        <button
          key={slide.title}
          aria-label={slide.title}
          className={cn(
            "h-2.5 rounded-full transition",
            index === slideIndex ? "w-8 bg-[var(--accent-strong)]" : "w-2.5 bg-white/20"
          )}
          onClick={() => setSlideIndex(index)}
          type="button"
        />
      )),
    [slideIndex, text.slides]
  );

  if (stage === "app") {
    return children;
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(242,202,80,0.14),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(242,202,80,0.08),transparent_30%)]" />

      {stage === "splash" ? (
        <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="intro-pulse-ring absolute h-28 w-28 rounded-full border border-[rgba(242,202,80,0.18)]" />
          <div className="intro-pulse-dot absolute h-4 w-4 rounded-full bg-[var(--accent-strong)]" />
          <div className="intro-fade-rise relative z-10 space-y-4">
            <div className="flex justify-center">
              <BrandMark />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
              {text.splashTag}
            </div>
          </div>
        </div>
      ) : null}

      {stage !== "splash" ? (
        <div className="relative mx-auto flex min-h-screen w-full max-w-[720px] items-center px-4 py-6 md:px-6">
          <Surface className="intro-fade-rise w-full rounded-[32px] bg-[rgba(20,20,20,0.88)] p-6 md:p-8">
            {stage === "welcome" ? (
              <div className="space-y-8">
                <div className="space-y-5 text-center">
                  <div className="flex justify-center">
                    <BrandMark />
                  </div>
                  <h1 className="mx-auto max-w-2xl font-display text-4xl font-extrabold tracking-[-0.06em] text-[var(--text-primary)] md:text-5xl">
                    {text.welcomeTitle}
                  </h1>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 md:p-7">
                    <div className="space-y-3">
                      <Badge tone="accent">{String(slideIndex + 1).padStart(2, "0")}</Badge>
                      <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)] md:text-3xl">
                        {text.slides[slideIndex].title}
                      </h2>
                      <p className="text-base leading-8 text-[var(--text-secondary)]">
                        {text.slides[slideIndex].body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">{dots}</div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      const nextState = {
                        ...introState,
                        hasSeenWelcome: true
                      };
                      commitState(nextState, hasUser ? "offers" : "auth");
                    }}
                    variant="ghost"
                  >
                    {text.skip}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      disabled={slideIndex === 0}
                      onClick={() => setSlideIndex((current) => Math.max(0, current - 1))}
                      variant="secondary"
                    >
                      {text.back}
                    </Button>
                    <Button
                      onClick={() => {
                        if (!isLastSlide) {
                          setSlideIndex((current) => Math.min(text.slides.length - 1, current + 1));
                          return;
                        }

                        const nextState = {
                          ...introState,
                          hasSeenWelcome: true
                        };
                        commitState(nextState, hasUser ? "offers" : "auth");
                      }}
                    >
                      {isLastSlide ? text.next : text.next}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {stage === "auth" ? (
              <div className="space-y-8">
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <BrandMark />
                  </div>
                  <div className="space-y-3">
                    <h1 className="font-display text-4xl font-extrabold tracking-[-0.06em] text-[var(--text-primary)] md:text-5xl">
                      {text.authTitle}
                    </h1>
                    <p className="mx-auto max-w-xl text-base leading-8 text-[var(--text-secondary)]">
                      {text.authBody}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Link href={localizeHref(locale, "/sign-in")}>
                    <Button className="w-full" size="lg" variant="secondary">
                      {text.signIn}
                    </Button>
                  </Link>
                  <Link href={localizeHref(locale, "/sign-up")}>
                    <Button className="w-full" size="lg">
                      {text.signUp}
                    </Button>
                  </Link>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      const nextState = {
                        ...introState,
                        authDeferred: true
                      };
                      commitState(nextState, "offers");
                    }}
                    variant="ghost"
                  >
                    {text.continueGuest}
                  </Button>
                </div>
              </div>
            ) : null}

            {stage === "offers" ? (
              <div className="space-y-8">
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <BrandMark />
                  </div>
                  <div className="space-y-3">
                    <h1 className="font-display text-4xl font-extrabold tracking-[-0.06em] text-[var(--text-primary)] md:text-5xl">
                      {text.offersTitle}
                    </h1>
                    <p className="mx-auto max-w-xl text-base leading-8 text-[var(--text-secondary)]">
                      {text.offersBody}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Surface className="rounded-[24px] bg-[var(--surface-strong)] p-6">
                    <div className="space-y-3">
                      <Badge tone="accent">{text.freeLabel}</Badge>
                      <div className="font-display text-3xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                        $0
                      </div>
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{text.freeBody}</p>
                    </div>
                  </Surface>
                  <Surface className="rounded-[24px] bg-[linear-gradient(180deg,rgba(242,202,80,0.08),rgba(255,255,255,0.02))] p-6">
                    <div className="space-y-3">
                      <Badge>{text.proLabel}</Badge>
                      <div className="font-display text-3xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                        Soon
                      </div>
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{text.proBody}</p>
                    </div>
                  </Surface>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      const nextState = {
                        ...introState,
                        hasSeenOffers: true,
                        hasCompletedIntro: true
                      };
                      commitState(nextState, "app");
                    }}
                    size="lg"
                  >
                    {text.continueToApp}
                  </Button>
                </div>
              </div>
            ) : null}
          </Surface>
        </div>
      ) : null}
    </div>
  );
}
