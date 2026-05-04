const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const turnstileVerifyTimeoutMs = 6_000;

export type TurnstileVerifyResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: "not_configured" | "missing_token" | "invalid_token" | "verify_failed" };

type TurnstileVerifyOptions = {
  expectedAction?: string;
  expectedHostname?: string;
  enforceMetadata?: boolean;
};

export function isTurnstileConfigured() {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
  options: TurnstileVerifyOptions = {},
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (!token || token.length < 10) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(turnstileVerifyTimeoutMs),
    });

    if (!response.ok) {
      return { ok: false, reason: "verify_failed" };
    }

    const data = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };

    if (data.success !== true) {
      return { ok: false, reason: "invalid_token" };
    }

    if (options.enforceMetadata) {
      const expectedHostname = options.expectedHostname?.toLowerCase();
      const actualHostname = data.hostname?.toLowerCase();

      if (expectedHostname && actualHostname !== expectedHostname) {
        return { ok: false, reason: "invalid_token" };
      }

      if (options.expectedAction && data.action !== options.expectedAction) {
        return { ok: false, reason: "invalid_token" };
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "verify_failed" };
  }
}
