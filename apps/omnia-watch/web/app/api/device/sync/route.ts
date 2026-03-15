import { NextResponse } from "next/server";
import { ingestLiveDeviceSync, isLiveDevicePipelineReady } from "@/lib/server/device-pipeline";
import { deviceSyncPayloadSchema, deviceSyncResponseSchema } from "@omnia-watch/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = deviceSyncPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sync payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isLiveDevicePipelineReady()) {
    const response = deviceSyncResponseSchema.parse({
      accepted: true,
      ingestedAt: new Date().toISOString(),
      recommendationCount: parsed.data.recommendations.length
    });

    return NextResponse.json(response, {
      headers: {
        "x-omnia-watch-mode": "demo"
      }
    });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json(
      { error: "A device bearer token is required." },
      { status: 401 }
    );
  }

  try {
    const response = await ingestLiveDeviceSync(token, parsed.data);
    return NextResponse.json(response, {
      headers: {
        "x-omnia-watch-mode": "connected"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ingest device sync." },
      { status: 400 }
    );
  }
}
