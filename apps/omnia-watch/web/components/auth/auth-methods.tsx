"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/auth/actions";
import { Button, Input } from "@omnia-watch/ui";
import { AuthForm } from "./auth-form";

interface AuthMethodsProps {
  credentialAction: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  dividerLabel: string;
  emailLabel: string;
  emailPlaceholder: string;
  googleAction: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  googleLabel: string;
  helperText: string;
  magicLinkAction: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  magicLinkHelperText: string;
  magicLinkLabel: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitLabel: string;
  workingLabel: string;
}

const initialState: AuthActionState = {
  error: null,
  success: null
};

function Message({
  state
}: {
  state: AuthActionState;
}) {
  if (state.error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        {state.error}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        {state.success}
      </div>
    );
  }

  return null;
}

function Divider({
  label
}: {
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-muted">
      <div className="h-px flex-1 bg-line/70" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-line/70" />
    </div>
  );
}

export function AuthMethods({
  credentialAction,
  dividerLabel,
  emailLabel,
  emailPlaceholder,
  googleAction,
  googleLabel,
  helperText,
  magicLinkAction,
  magicLinkHelperText,
  magicLinkLabel,
  passwordLabel,
  passwordPlaceholder,
  submitLabel,
  workingLabel
}: AuthMethodsProps) {
  const [oauthState, oauthFormAction, oauthPending] = useActionState(googleAction, initialState);
  const [magicState, magicFormAction, magicPending] = useActionState(
    magicLinkAction,
    initialState
  );

  return (
    <div className="space-y-5">
      <form action={oauthFormAction} className="space-y-3">
        <Button className="w-full" disabled={oauthPending} type="submit" variant="outline">
          {oauthPending ? workingLabel : googleLabel}
        </Button>
        <Message state={oauthState} />
      </form>

      <Divider label={dividerLabel} />

      <AuthForm
        action={credentialAction}
        emailLabel={emailLabel}
        emailPlaceholder={emailPlaceholder}
        helperText={helperText}
        pendingLabel={workingLabel}
        passwordLabel={passwordLabel}
        passwordPlaceholder={passwordPlaceholder}
        submitLabel={submitLabel}
      />

      <Divider label={dividerLabel} />

      <form action={magicFormAction} className="space-y-4">
        <p className="text-sm leading-6 text-muted">{magicLinkHelperText}</p>
        <label className="space-y-2">
          <span className="text-sm text-muted">{emailLabel}</span>
          <Input name="email" placeholder={emailPlaceholder} required type="email" />
        </label>
        <Message state={magicState} />
        <Button className="w-full" disabled={magicPending} type="submit" variant="secondary">
          {magicPending ? workingLabel : magicLinkLabel}
        </Button>
      </form>
    </div>
  );
}
