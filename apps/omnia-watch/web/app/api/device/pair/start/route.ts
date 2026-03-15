import { NextResponse } from "next/server";
import { startLivePairing, isLiveDevicePipelineReady } from "@/lib/server/device-pipeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pairingStartRequestSchema, pairingStartResponseSchema } from "@omnia-watch/validation";

function generatePairingCode() {
  return `OW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = pairingStartRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pairing request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isLiveDevicePipelineReady()) {
    const payload = {
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      pairingCode: generatePairingCode(),
      supportLink: "https://omniacreata.com/omnia-watch/support"
    };

    const validated = pairingStartResponseSchema.parse(payload);
    return NextResponse.json(validated, {
      headers: {
        "x-omnia-watch-mode": "demo"
      }
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase public client is not configured." },
      { status: 503 }
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const response = await startLivePairing(user.id, parsed.data);
    return NextResponse.json(response, {
      headers: {
        "x-omnia-watch-mode": "connected"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start pairing." },
      { status: 500 }
    );
  }
}
