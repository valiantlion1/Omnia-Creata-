"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/auth/actions";
import { Button, Input } from "@omnia-watch/ui";

interface AuthFormProps {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  emailLabel: string;
  emailPlaceholder: string;
  helperText: string;
  pendingLabel?: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitLabel: string;
}

const initialState: AuthActionState = {
  error: null,
  success: null
};

export function AuthForm({
  action,
  emailLabel,
  emailPlaceholder,
  helperText,
  pendingLabel = "Working...",
  passwordLabel,
  passwordPlaceholder,
  submitLabel
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <p className="text-sm leading-6 text-muted">{helperText}</p>
      </div>
      <label className="space-y-2">
        <span className="text-sm text-muted">{emailLabel}</span>
        <Input name="email" placeholder={emailPlaceholder} required type="email" />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-muted">{passwordLabel}</span>
        <Input
          minLength={8}
          name="password"
          placeholder={passwordPlaceholder}
          required
          type="password"
        />
      </label>
      {state.error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {state.success}
        </div>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
