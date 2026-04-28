import { NextResponse } from "next/server";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  interest: string;
  message: string;
  website?: string;
};

const maxBodyBytes = 16 * 1024;
const maxLengths = {
  name: 120,
  email: 254,
  company: 160,
  interest: 160,
  message: 2500,
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

export async function POST(request: Request) {
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

  let body: Partial<ContactPayload>;
  try {
    body = (await request.json()) as Partial<ContactPayload>;
  } catch {
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

  try {
    if (webhookUrl) {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enrichedPayload),
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
