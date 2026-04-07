import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import { silenceIncident } from "@/lib/ocos-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeRequest(request))) {
    return unauthorizedResponse();
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { minutes?: number };
  const incident = await silenceIncident(id, body.minutes ?? 30);

  if (!incident) {
    return NextResponse.json(
      {
        message: "Incident not found."
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json({
    message: `Incident muted for ${body.minutes ?? 30} minutes.`,
    incident
  });
}
