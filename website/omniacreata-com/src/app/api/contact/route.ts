import { NextResponse } from "next/server";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  interest: string;
  message: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(payload: ContactPayload) {
  return {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    company: payload.company?.trim() ?? "",
    interest: payload.interest.trim(),
    message: payload.message.trim(),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as ContactPayload;
  const payload = sanitize(body);

  if (!payload.name || payload.name.length < 2) {
    return NextResponse.json(
      { message: "Please provide a valid name." },
      { status: 400 },
    );
  }

  if (!isValidEmail(payload.email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
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

  const enrichedPayload = {
    ...payload,
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
      console.info("Omnia Creata contact inquiry", enrichedPayload);
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
