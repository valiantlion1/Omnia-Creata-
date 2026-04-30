import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";

export type ContactDeliveryPayload = {
  name: string;
  email: string;
  company: string;
  interest: string;
  message: string;
  source: "omniacreata.com";
  receivedAt: string;
};

export type ContactDeliveryResult =
  | { ok: true }
  | { ok: false; status: "not_configured" | "invalid_config" | "failed" };

const webhookTimeoutMs = 8_000;

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isPrivateIpLiteral(hostname: string) {
  const normalized = hostname.toLowerCase();
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    const parts = normalized.split(".").map((part) => Number(part));
    const [first, second] = parts;
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first === 0
    );
  }

  if (ipVersion === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  return false;
}

function getWebhookUrl() {
  const rawUrl = readEnv("CONTACT_WEBHOOK_URL");

  if (!rawUrl) {
    return { ok: false as const, missing: true as const };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false as const, missing: false as const };
  }

  const localDevelopment =
    process.env.NODE_ENV !== "production" && isLocalhost(url.hostname);
  const allowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && localDevelopment);

  if (
    !allowedProtocol ||
    !url.hostname ||
    (!localDevelopment && (isLocalhost(url.hostname) || isPrivateIpLiteral(url.hostname)))
  ) {
    return { ok: false as const, missing: false as const };
  }

  return { ok: true as const, url };
}

function signedHeaders(body: string) {
  const secret = readEnv("CONTACT_WEBHOOK_SECRET");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const eventId = randomUUID();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-OmniaCreata-Event": "contact.inquiry.v1",
    "X-OmniaCreata-Event-Id": eventId,
    "X-OmniaCreata-Timestamp": timestamp,
  };

  if (secret) {
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    headers["X-OmniaCreata-Signature"] = `sha256=${signature}`;
  }

  return headers;
}

export async function deliverContactInquiry(
  payload: ContactDeliveryPayload,
): Promise<ContactDeliveryResult> {
  const config = getWebhookUrl();

  if (!config.ok) {
    return { ok: false, status: config.missing ? "not_configured" : "invalid_config" };
  }

  if (process.env.NODE_ENV === "production" && !readEnv("CONTACT_WEBHOOK_SECRET")) {
    return { ok: false, status: "invalid_config" };
  }

  const body = JSON.stringify(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), webhookTimeoutMs);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: signedHeaders(body),
      body,
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, status: "failed" };
    }

    return { ok: true };
  } catch {
    return { ok: false, status: "failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export function isContactDeliveryConfigured() {
  if (!getWebhookUrl().ok) {
    return false;
  }

  return process.env.NODE_ENV !== "production" || Boolean(readEnv("CONTACT_WEBHOOK_SECRET"));
}
