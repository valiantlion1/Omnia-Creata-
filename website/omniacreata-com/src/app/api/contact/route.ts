import { NextResponse } from "next/server";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  interest: string;
  message: string;
  website?: string;
  turnstileToken?: string;
};

const maxBodyBytes = 16 * 1024;
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxRequests = 5;
const rateLimitMaxEntries = 5_000;
const webhookTimeoutMs = 8_000;
const maxLengths = {
  name: 120,
  email: 254,
  company: 160,
  interest: 160,
  message: 2500,
  turnstileToken: 4096,
};

type RateLimitEntry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as typeof globalThis & {
  omniaContactRateLimit?: Map<string, RateLimitEntry>;
};

const contactRateLimit =
  globalForRateLimit.omniaContactRateLimit ??
  new Map<string, RateLimitEntry>();

globalForRateLimit.omniaContactRateLimit = contactRateLimit;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const cloudflareIp = request.headers.get("cf-connecting-ip") ?? "";
  const realIp = request.headers.get("x-real-ip") ?? "";

  return (
    forwardedFor.split(",")[0]?.trim() ||
    cloudflareIp.trim() ||
    realIp.trim() ||
    "unknown"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  pruneRateLimit(now);
  const entry = contactRateLimit.get(key);

  if (!entry || entry.resetAt <= now) {
    contactRateLimit.set(key, {
      count: 1,
      resetAt: now + rateLimitWindowMs,
    });
    return false;
  }

  entry.count += 1;
  return entry.count > rateLimitMaxRequests;
}

function pruneRateLimit(now: number) {
  for (const [key, entry] of contactRateLimit) {
    if (entry.resetAt <= now) {
      contactRateLimit.delete(key);
    }
  }

  while (contactRateLimit.size > rateLimitMaxEntries) {
    const oldestKey = contactRateLimit.keys().next().value;
    if (!oldestKey) {
      break;
    }
    contactRateLimit.delete(oldestKey);
  }
}

function hostFromRequest(request: Request) {
  return (
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function isSameOriginRequest(request: Request) {
  const host = hostFromRequest(request);
  const origin = request.headers.get("origin");

  if (!host || !origin) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

function sanitize(payload: Partial<ContactPayload>) {
  return {
    name: asString(payload.name).trim().slice(0, maxLengths.name + 1),
    email: asString(payload.email).trim().toLowerCase().slice(0, maxLengths.email + 1),
    company: asString(payload.company).trim().slice(0, maxLengths.company + 1),
    interest: asString(payload.interest).trim().slice(0, maxLengths.interest + 1),
    message: asString(payload.message).trim().slice(0, maxLengths.message + 1),
    website: asString(payload.website).trim(),
    turnstileToken: asString(payload.turnstileToken)
      .trim()
      .slice(0, maxLengths.turnstileToken + 1),
  };
}

function isRecord(value: unknown): value is Partial<ContactPayload> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readLimitedText(request: Request) {
  const reader = request.body?.getReader();

  if (!reader) {
    return { ok: true as const, text: "" };
  }

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytesRead += value.byteLength;

    if (bytesRead > maxBodyBytes) {
      await reader.cancel();
      return { ok: false as const };
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();

  return { ok: true as const, text };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Please submit the contact form from omniacreata.com." },
      { status: 403 },
    );
  }

  const ip = clientKey(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { message: "Please wait a little before sending another message." },
      { status: 429 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { message: "Please refresh the page and try again." },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return NextResponse.json(
      { message: "Please keep your message shorter." },
      { status: 413 },
    );
  }

  const rawBody = await readLimitedText(request);

  if (!rawBody.ok) {
    return NextResponse.json(
      { message: "Please keep your message shorter." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody.text);
  } catch {
    return NextResponse.json(
      { message: "Please submit a valid contact request." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { message: "Please submit a valid contact request." },
      { status: 400 },
    );
  }

  const payload = sanitize(body);

  if (payload.website) {
    return NextResponse.json(
      {
        message:
          "Your inquiry has been received. The Omnia Creata team will follow up through the official omniacreata.com contact channels.",
      },
      { status: 200 },
    );
  }

  if (!payload.name || payload.name.length < 2) {
    return NextResponse.json(
      { message: "Please provide a valid name." },
      { status: 400 },
    );
  }

  if (!isValidEmail(payload.email) || payload.email.length > maxLengths.email) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  if (
    payload.name.length > maxLengths.name ||
    payload.company.length > maxLengths.company ||
    payload.interest.length > maxLengths.interest
  ) {
    return NextResponse.json(
      { message: "Please shorten the contact details and try again." },
      { status: 400 },
    );
  }

  if (!payload.interest || payload.interest.length < 3) {
    return NextResponse.json(
      { message: "Please tell us what you are contacting us about." },
      { status: 400 },
    );
  }

  if (!payload.message || payload.message.length < 12) {
    return NextResponse.json(
      { message: "Please include a more detailed message." },
      { status: 400 },
    );
  }

  if (payload.message.length > maxLengths.message) {
    return NextResponse.json(
      { message: "Please keep your message shorter." },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production" && !isTurnstileConfigured()) {
    return NextResponse.json(
      {
        message:
          "Request verification is not configured yet. Please email hello@omniacreata.com directly.",
      },
      { status: 503 },
    );
  }

  const turnstileResult = await verifyTurnstile(payload.turnstileToken, ip, {
    enforceMetadata: process.env.NODE_ENV === "production",
    expectedAction: "contact",
    expectedHostname: hostFromRequest(request),
  });

  if (!turnstileResult.ok) {
    const status =
      turnstileResult.reason === "missing_token" ||
      turnstileResult.reason === "invalid_token"
        ? 400
        : 503;
    return NextResponse.json(
      {
        message:
          "We could not verify the request. Please reload the page and try again.",
      },
      { status },
    );
  }

  const enrichedPayload = {
    name: payload.name,
    email: payload.email,
    company: payload.company,
    interest: payload.interest,
    message: payload.message,
    source: "omniacreata.com",
    receivedAt: new Date().toISOString(),
  };

  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  const webhookSecret = process.env.CONTACT_WEBHOOK_SECRET;

  try {
    if (webhookUrl) {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret
            ? { "X-Omnia-Webhook-Secret": webhookSecret }
            : {}),
        },
        body: JSON.stringify(enrichedPayload),
        signal: AbortSignal.timeout(webhookTimeoutMs),
      });

      if (!webhookResponse.ok) {
        throw new Error("Webhook delivery failed.");
      }
    } else {
      console.info("Omnia Creata contact inquiry", {
        source: enrichedPayload.source,
        receivedAt: enrichedPayload.receivedAt,
        interest: enrichedPayload.interest,
        hasCompany: Boolean(enrichedPayload.company),
      });
    }
  } catch (error) {
    console.error("Contact form delivery error", error);
    return NextResponse.json(
      {
        message:
          "We could not submit your request right now. Please email hello@omniacreata.com directly.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message:
        "Your inquiry has been received. The Omnia Creata team will follow up through the official omniacreata.com contact channels.",
    },
    { status: 200 },
  );
}
