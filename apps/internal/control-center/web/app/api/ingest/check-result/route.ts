import { checkRunPayloadSchema } from "@ocos/contracts";
import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import { recordCheckResult } from "@/lib/ocos-store";

export async function POST(request: Request) {
  if (!(await authorizeRequest(request, { requireToken: true }))) {
    return unauthorizedResponse();
  }
  const body = await request.json();
  const payload = checkRunPayloadSchema.parse(body);
  const result = await recordCheckResult(payload);

  return NextResponse.json({
    message: "Check result ingested.",
    incident: result.incident,
    notification: result.notification,
    suggestedAction: result.suggestedAction
  });
}
