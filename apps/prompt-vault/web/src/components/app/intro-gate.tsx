"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@prompt-vault/types";
import { brand } from "@prompt-vault/config";
import { BrandMark } from "@/components/shared/brand-mark";
import { Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { localizeHref } from "@/lib/locale";
import {
  hasSeenSessionSplash,
  loadIntroState,
  markSessionSplashSeen,
  saveIntroState,
  type IntroStateRecord,
} from "@/lib/storage";

type IntroStage = "booting" | "splash" | "welcome" | "auth" | "offers" | "app";

const copy = {
  en: {
    splashTag: "Your idea system",
    welcomeTitle: "Capture ideas. Refine later.",
    welcomeSub: "A fast, calm place for every thought worth keeping.",
    slides: [
      {
        title: "Capture before it disappears",
        body: "Save ideas, notes, prompts, and project thoughts in seconds.",
      },
      {
        title: "Organize without the overhead",
        body: "Projects and tags stay close but never overpower your writing.",
      },
      {
        title: "Refine when it matters",
        body: "Come back, version it, expand it, reuse it.",
      },
    ],
    authTitle: "Continue your way",
    authBody: "Create an account for sync, or continue as a guest.",
    signIn: "Sign in",
    signUp: "Create account",
    continueGuest: "Continue as guest",
    offersTitle: "Start free",
    offersBody: "The beta is fast and accessible. Pro features come with V1.",
    freeLabel: "Free beta",
    freeBody: "Capture, projects, local persistence, and the core workflow.",
    proLabel: "Pro — coming soon",
    proBody: "No ads, bigger limits, AI-assisted cleanup.",
    continueToApp: "Get started",
    next: "Next",
    back: "Back",
    skip: "Skip",
  },
  tr: {
    splashTag: "Fikir sisteminiz",
    welcomeTitle: "Fikirleri yakala. Sonra düzenle.",
    welcomeSub: "Saklamaya değer her düşünce için hızlı, sakin bir alan.",
    slides: [
      {
        title: "Kaybolmadan yakala",
        body: "Fikirleri, notları, promptları ve proje düşüncelerini saniyeler içinde kaydet.",
      },
      {
        title: "Düzeni yük haline getirme",
        body: "Projeler ve etiketler yakında kalır ama yazı alanını boğmaz.",
      },
      {
        title: "Gerektiğinde geliştir",
        body: "Geri dön, versiyonla, genişlet, yeniden kullan.",
      },
    ],
    authTitle: "İstediğin şekilde devam et",
    authBody: "Sync için hesap oluştur ya da misafir olarak devam et.",
    signIn: "Giriş yap",
    signUp: "Hesap oluştur",
    continueGuest: "Misafir devam et",
    offersTitle: "Ücretsiz başla",
    offersBody: "Beta hızlı ve erişilebilir. Pro özellikler V1 ile gelir.",
    freeLabel: "Ücretsiz beta",
    freeBody: "Capture, projeler, lokal kalıcılık ve temel akış.",
    proLabel: "Pro — yakında",
    proBody: "Reklamsız, daha yüksek limitler, AI destekli düzenleme.",
    continueToApp: "Başla",
    next: "İleri",
    back: "Geri",
    skip: "Atla",
  },
} as const;

function resolveStage(state: IntroStateRecord, hasUser: boolean) {
  if (state.hasCompletedIntro) return "app" as const;
  if (!state.hasSeenWelcome) return "welcome" as const;
  if (!hasUser && !state.authDeferred) return "auth" as const;
  if (!state.hasSeenOffers) return "offers" as const;
  return "app" as const;
}

export function IntroGate({
  children,
  locale,
  hasUser,
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
    if (stage !== "splash") return;
    markSessionSplashSeen();
    const timeout = window.setTimeout(() => {
      setStage(resolveStage(introState, hasUser));
    }, 1800);
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
            "h-1.5 rounded-full transition-all duration-300",
            index === slideIndex
              ? "w-6 bg-[var(--accent)]"
              : "w-1.5 bg-white/15"
          )}
          onClick={() => setSlideIndex(index)}
          type="button"
        />
      )),
    [slideIndex, text.slides]
  );

  if (stage === "app") return children;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Splash */}
      {stage === "splash" ? (
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Glow dot */}
          <div className="intro-scale intro-glow-pulse flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <div className="h-3 w-3 rounded-full bg-[var(--accent)]" />
          </div>

          <div className="intro-fade space-y-2" style={{ animationDelay: "200ms" }}>
            <div className="font-display text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
              {brand.name}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              {text.splashTag}
            </div>
          </div>
        </div>
      ) : null}

      {/* Welcome / Auth / Offers */}
      {stage !== "splash" ? (
        <div className="w-full max-w-[440px] px-6">
          <div className="intro-fade space-y-8">
            {stage === "welcome" ? (
              <>
                <div className="space-y-3 text-center">
                  <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
                    {text.welcomeTitle}
                  </h1>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {text.welcomeSub}
                  </p>
                </div>

                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
                      {String(slideIndex + 1).padStart(2, "0")}
                    </div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                      {text.slides[slideIndex].title}
                    </h2>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      {text.slides[slideIndex].body}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">{dots}</div>

                <div className="flex items-center justify-between gap-3">
                  <Button onClick={() => {
                    const nextState = { ...introState, hasSeenWelcome: true };
                    commitState(nextState, hasUser ? "offers" : "auth");
                  }} variant="ghost" size="sm">
                    {text.skip}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      disabled={slideIndex === 0}
                      onClick={() => setSlideIndex((c) => Math.max(0, c - 1))}
                      variant="secondary"
                      size="sm"
                    >
                      {text.back}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!isLastSlide) {
                          setSlideIndex((c) => Math.min(text.slides.length - 1, c + 1));
                          return;
                        }
                        const nextState = { ...introState, hasSeenWelcome: true };
                        commitState(nextState, hasUser ? "offers" : "auth");
                      }}
                    >
                      {text.next}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {stage === "auth" ? (
              <>
                <div className="space-y-3 text-center">
                  <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
                    {text.authTitle}
                  </h1>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {text.authBody}
                  </p>
                </div>

                <div className="space-y-3">
                  <Link href={localizeHref(locale, "/sign-up")}>
                    <Button className="w-full" size="lg">{text.signUp}</Button>
                  </Link>
                  <Link href={localizeHref(locale, "/sign-in")}>
                    <Button className="w-full" size="lg" variant="secondary">{text.signIn}</Button>
                  </Link>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      const nextState = { ...introState, authDeferred: true };
                      commitState(nextState, "offers");
                    }}
                    variant="ghost"
                  >
                    {text.continueGuest}
                  </Button>
                </div>
              </>
            ) : null}

            {stage === "offers" ? (
              <>
                <div className="space-y-3 text-center">
                  <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
                    {text.offersTitle}
                  </h1>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {text.offersBody}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge tone="accent">{text.freeLabel}</Badge>
                        <span className="text-lg font-bold text-[var(--text-primary)]">$0</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{text.freeBody}</p>
                    </div>
                  </div>
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 opacity-60">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge>{text.proLabel}</Badge>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{text.proBody}</p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    const nextState = {
                      ...introState,
                      hasSeenOffers: true,
                      hasCompletedIntro: true,
                    };
                    commitState(nextState, "app");
                  }}
                >
                  {text.continueToApp}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
