import { NextResponse } from "next/server";
import {
  deliverContactInquiry,
  type ContactDeliveryPayload,
} from "@/lib/server/contact-delivery";
import { contactChannels } from "@/lib/contact-channels";

export const runtime = "nodejs";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  interest: string;
  message: string;
  website?: string;
};

const maxBodyBytes = 16 * 1024;
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxRequests = 5;
const officialContactEmail = contactChannels.general;
const maxLengths = {
  name: 120,
  email: 254,
  company: 160,
  interest: 160,
  message: 2500,
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

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

function isRateLimited(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
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

  if (isRateLimited(request)) {
    return NextResponse.json(
      { message: "Please wait a little before sending another message." },
      { status: 429 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { message: "Please submit the contact form as JSON." },
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
          "Your inquiry has been received. The OmniaCreata team will follow up through the official omniacreata.com contact channels.",
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

  const enrichedPayload: ContactDeliveryPayload = {
    name: payload.name,
    email: payload.email,
    company: payload.company,
    interest: payload.interest,
    message: payload.message,
    source: "omniacreata.com",
    receivedAt: new Date().toISOString(),
  };

  const delivery = await deliverContactInquiry(enrichedPayload);

  if (!delivery.ok) {
    if (
      delivery.status === "not_configured" ||
      delivery.status === "invalid_config"
    ) {
      return NextResponse.json(
        {
          message:
            `Please email ${officialContactEmail} directly for the fastest response.`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        message:
          `We could not submit your request right now. Please email ${officialContactEmail} directly.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message:
        "Your inquiry has been received. The OmniaCreata team will follow up through the official omniacreata.com contact channels.",
    },
    { status: 200 },
  );
}
