import { serviceEventPayloadSchema } from "@ocos/contracts";
import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import { recordServiceEvent } from "@/lib/ocos-store";

export async function POST(request: Request) {
  if (!(await authorizeRequest(request, { requireToken: true }))) {
    return unauthorizedResponse();
  }
  const body = await request.json();
  const payload = serviceEventPayloadSchema.parse(body);
  const result = await recordServiceEvent(payload);

  return NextResponse.json({
    message: "Service event ingested.",
    incident: result.incident,
    notification: result.notification
  });
}
