"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Messages } from "@/i18n/messages";
import { Button } from "@/components/ui/button";

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

export function ContactForm({ copy, prefill }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(initialState);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(!turnstileSiteKey);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

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
        "Tell us what you want to build with Omnia Creata.",
    },
    submit: copy?.submit ?? "Send inquiry",
    sending: copy?.sending ?? "Sending...",
    helper:
      copy?.helper ??
      "Share a short note and we will get back to you.",
  };

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileContainerRef.current) {
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
              message: "Verification could not load. Please refresh and try again.",
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
          message: "Verification could not load. Please refresh and try again.",
        });
      });

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setState(initialState);

      if (turnstileSiteKey && !turnstileToken) {
        setTurnstileReady(false);
        setState({
          status: "error",
          message: "Please complete verification before sending.",
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

      <label className="block space-y-3">
        <span className="text-sm font-medium text-foreground">
          {resolvedCopy.labels.message}
        </span>
        <textarea
          className="min-h-40 w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-[rgba(216,181,109,0.42)]"
          defaultValue={prefill?.message}
          maxLength={2500}
          name="message"
          placeholder={resolvedCopy.placeholders.message}
          required
        />
      </label>

      {turnstileSiteKey ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
          <div ref={turnstileContainerRef} />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${
            state.status === "error" ? "text-[var(--danger)]" : "text-foreground-soft"
          }`}
        >
          {state.message || resolvedCopy.helper}
        </p>
        <Button
          className="min-w-40"
          disabled={isPending || !turnstileReady}
          size="lg"
          type="submit"
          variant="primary"
        >
          {isPending ? resolvedCopy.sending : resolvedCopy.submit}
        </Button>
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
  return (
    <label className="block space-y-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        autoComplete={autoComplete}
        className="h-[52px] w-full rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-[rgba(216,181,109,0.42)]"
        defaultValue={defaultValue}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
