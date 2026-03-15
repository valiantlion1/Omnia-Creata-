"use client";

import type { Locale } from "@prompt-vault/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Surface } from "@/components/ui/primitives";
import { localizeHref } from "@/lib/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";

export function AuthCard({
  locale,
  mode
}: {
  locale: Locale;
  mode: "sign-in" | "sign-up" | "reset";
}) {
  const router = useRouter();
  const { t } = useLocaleContext();
  const { notify } = useToast();
  const { authMode } = useVault();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const title =
    mode === "sign-in"
      ? t("auth.signInTitle")
      : mode === "sign-up"
        ? t("auth.signUpTitle")
        : t("auth.forgotPassword");

  const description =
    mode === "sign-in"
      ? t("auth.signInDescription")
      : mode === "sign-up"
        ? t("auth.signUpDescription")
        : t("auth.resetDescription");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      if (!authMode.enabled) {
        notify(mode === "reset" ? t("auth.resetPreviewMessage") : t("auth.previewEnterAppMessage"));
        router.push(localizeHref(locale, "/app"));
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        notify(t("auth.clientInitError"));
        return;
      }

      try {
        if (mode === "sign-in") {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          notify(t("auth.signedInSuccess"));
          router.push(localizeHref(locale, "/app"));
          router.refresh();
          return;
        }

        if (mode === "sign-up") {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName
              }
            }
          });
          if (error) throw error;
          notify(t("auth.checkEmailConfirm"));
          router.push(localizeHref(locale, "/sign-in"));
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${localizeHref(locale, "/sign-in")}`
        });
        if (error) throw error;
        notify(t("auth.resetEmailSent"));
      } catch (error) {
        notify(error instanceof Error ? error.message : t("common.somethingWentWrong"));
      }
    });
  }

  return (
    <Surface className="w-full max-w-xl space-y-6 p-6 md:p-8">
      <div className="space-y-3">
        {!authMode.enabled ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {t("auth.previewBanner")}
          </div>
        ) : null}
        <div>
          <h1 className="font-display text-4xl tracking-[-0.04em] text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <Field label={t("auth.fullName")}>
            <Input
              onChange={(event) => setFullName(event.target.value)}
              placeholder={t("auth.fullNamePlaceholder")}
              value={fullName}
            />
          </Field>
        ) : null}
        <Field label={t("auth.email")}>
          <Input
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            type="email"
            value={email}
          />
        </Field>
        {mode !== "reset" ? (
          <Field label={t("auth.password")}>
            <Input
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              type="password"
              value={password}
            />
          </Field>
        ) : null}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? t("common.working") : t("auth.continue")}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
        {mode === "sign-in" ? (
          <>
            <Link href={localizeHref(locale, "/forgot-password")}>{t("auth.forgotPassword")}</Link>
            <Link href={localizeHref(locale, "/sign-up")}>{t("common.signUp")}</Link>
          </>
        ) : mode === "sign-up" ? (
          <>
            <Link href={localizeHref(locale, "/sign-in")}>{t("common.signIn")}</Link>
            <Link href={localizeHref(locale, "/forgot-password")}>{t("auth.forgotPassword")}</Link>
          </>
        ) : (
          <Link href={localizeHref(locale, "/sign-in")}>{t("common.signIn")}</Link>
        )}
      </div>
    </Surface>
  );
}
