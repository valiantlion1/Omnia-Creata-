"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { Messages } from "@/i18n/messages";
import { Button, ButtonLink } from "@/components/ui/button";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          action?: string;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ContactFormProps = {
  copy?: Messages["contactForm"];
  formEnabled?: boolean;
  prefill?: {
    name?: string;
    email?: string;
    company?: string;
    interest?: string;
    message?: string;
  };
};

const initialState: FormState = {
  status: "idle",
  message: "",
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile_load_failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile_load_failed"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function ContactForm({ copy, formEnabled = true, prefill }: ContactFormProps) {
  const formAvailable = formEnabled && Boolean(turnstileSiteKey);
  const requiresEmailFallback = process.env.NODE_ENV === "production" && !formAvailable;
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(initialState);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(!formAvailable && !requiresEmailFallback);
  const messageId = useId();
  const statusId = useId();
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const isTurkish = copy?.submit === "Mesaj gonder";
  const verificationLoadError = isTurkish
    ? "Dogrulama yuklenemedi. Sayfayi yenileyip tekrar deneyin."
    : "Verification could not load. Please refresh and try again.";
  const verificationRequiredError = isTurkish
    ? "Gondermeden once dogrulamayi tamamlayin."
    : "Please complete verification before sending.";
  const fallbackMessage = isTurkish
    ? "Bize dogrudan hello@omniacreata.com adresinden yazin. En uygun inbox'tan yanitlayacagiz."
    : "Email hello@omniacreata.com directly. We will reply from the right inbox.";

  const resolvedCopy = {
    labels: {
      name: copy?.name ?? "Name",
      email: copy?.email ?? "Email",
      company: copy?.company ?? "Company",
      interest: copy?.interest ?? "Area of interest",
      message: copy?.message ?? "Message",
    },
    placeholders: {
      name: copy?.placeholderName ?? "Your name",
      email: copy?.placeholderEmail ?? "you@company.com",
      company: copy?.placeholderCompany ?? "Company or studio",
      interest:
        copy?.placeholderInterest ?? "Studio, partnership, pricing...",
      message:
        copy?.placeholderMessage ??
        "Tell us what you want to build with OmniaCreata.",
    },
    submit: copy?.submit ?? "Send inquiry",
    sending: copy?.sending ?? "Sending...",
    helper:
      requiresEmailFallback
        ? fallbackMessage
        : copy?.helper ?? "Share a short note and we will get back to you.",
  };

  useEffect(() => {
    if (!formAvailable || !turnstileContainerRef.current) {
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileContainerRef.current) {
          return;
        }
        if (turnstileWidgetIdRef.current) {
          return;
        }

        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          action: "contact",
          theme: "dark",
          callback: (token) => {
            setTurnstileToken(token);
            setTurnstileReady(true);
          },
          "expired-callback": () => {
            setTurnstileToken("");
            setTurnstileReady(false);
          },
          "error-callback": () => {
            setTurnstileToken("");
            setTurnstileReady(false);
            setState({
              status: "error",
              message: verificationLoadError,
            });
          },
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setTurnstileReady(false);
        setState({
          status: "error",
          message: verificationLoadError,
        });
      });

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [formAvailable, verificationLoadError]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setState(initialState);

      if (requiresEmailFallback) {
        setState({
          status: "error",
          message: resolvedCopy.helper,
        });
        return;
      }

      if (formAvailable && !turnstileToken) {
        setTurnstileReady(false);
        setState({
          status: "error",
          message: verificationRequiredError,
        });
        return;
      }

      const payload = {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        company: String(formData.get("company") ?? ""),
        interest: String(formData.get("interest") ?? ""),
        message: String(formData.get("message") ?? ""),
        website: String(formData.get("website") ?? ""),
        turnstileToken,
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        if (turnstileWidgetIdRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
          setTurnstileToken("");
          setTurnstileReady(false);
        }
        setState({
          status: "error",
          message: result.message ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setState({
        status: "success",
        message: result.message ?? "Thanks. We will get back to you soon.",
      });
      form.reset();
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setTurnstileToken("");
        setTurnstileReady(false);
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <input
        autoComplete="off"
        className="hidden"
        name="website"
        tabIndex={-1}
        type="text"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          autoComplete="name"
          defaultValue={prefill?.name}
          label={resolvedCopy.labels.name}
          maxLength={120}
          name="name"
          placeholder={resolvedCopy.placeholders.name}
          required
        />
        <Field
          autoComplete="email"
          defaultValue={prefill?.email}
          label={resolvedCopy.labels.email}
          maxLength={254}
          name="email"
          placeholder={resolvedCopy.placeholders.email}
          required
          type="email"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          autoComplete="organization"
          defaultValue={prefill?.company}
          label={resolvedCopy.labels.company}
          maxLength={160}
          name="company"
          placeholder={resolvedCopy.placeholders.company}
        />
        <Field
          defaultValue={prefill?.interest}
          label={resolvedCopy.labels.interest}
          maxLength={160}
          name="interest"
          placeholder={resolvedCopy.placeholders.interest}
          required
        />
      </div>

      <label className="block space-y-3" htmlFor={messageId}>
        <span className="text-sm font-medium text-foreground" id={`${messageId}-label`}>
          {resolvedCopy.labels.message}
        </span>
        <textarea
          aria-describedby={statusId}
          aria-labelledby={`${messageId}-label`}
          className="min-h-40 w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-[rgba(216,181,109,0.42)]"
          defaultValue={prefill?.message}
          id={messageId}
          maxLength={2500}
          name="message"
          placeholder={resolvedCopy.placeholders.message}
          required
        />
      </label>

      {formAvailable ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
          <div ref={turnstileContainerRef} />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          id={statusId}
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm ${
            state.status === "error" ? "text-[var(--danger)]" : "text-foreground-soft"
          }`}
        >
          {state.message || resolvedCopy.helper}
        </p>
        {requiresEmailFallback ? (
          <ButtonLink href="mailto:hello@omniacreata.com" size="lg" variant="primary">
            {isTurkish ? "E-posta gonder" : "Email us"}
          </ButtonLink>
        ) : (
          <Button
            className="min-w-40"
            disabled={isPending || !turnstileReady}
            size="lg"
            type="submit"
            variant="primary"
          >
            {isPending ? resolvedCopy.sending : resolvedCopy.submit}
          </Button>
        )}
      </div>
    </form>
  );
}

type FieldProps = {
  autoComplete?: string;
  defaultValue?: string;
  label: string;
  maxLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
};

function Field({
  autoComplete,
  defaultValue,
  label,
  maxLength,
  name,
  placeholder,
  required = false,
  type = "text",
}: FieldProps) {
  const id = useId();

  return (
    <label className="block space-y-3" htmlFor={id}>
      <span className="text-sm font-medium text-foreground" id={`${id}-label`}>{label}</span>
      <input
        aria-labelledby={`${id}-label`}
        autoComplete={autoComplete}
        className="h-[52px] w-full rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-[rgba(216,181,109,0.42)]"
        defaultValue={defaultValue}
        id={id}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
