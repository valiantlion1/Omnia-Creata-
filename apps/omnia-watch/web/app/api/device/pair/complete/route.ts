import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { completeLivePairing, isLiveDevicePipelineReady } from "@/lib/server/device-pipeline";
import {
  pairingCompleteRequestSchema,
  pairingCompleteResponseSchema
} from "@omnia-watch/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = pairingCompleteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pairing payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isLiveDevicePipelineReady()) {
    const response = pairingCompleteResponseSchema.parse({
      deviceId: randomUUID(),
      deviceToken: randomBytes(24).toString("hex"),
      syncBaseUrl:
        process.env.AGENT_SYNC_API_BASE_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        "http://localhost:3000"
    });

    return NextResponse.json(response, {
      headers: {
        "x-omnia-watch-mode": "demo"
      }
    });
  }

  try {
    const response = await completeLivePairing(parsed.data);
    return NextResponse.json(response, {
      headers: {
        "x-omnia-watch-mode": "connected"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete pairing." },
      { status: 400 }
    );
  }
}
