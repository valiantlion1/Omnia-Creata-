import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import { acknowledgeIncident } from "@/lib/ocos-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeRequest(request))) {
    return unauthorizedResponse();
  }
  const { id } = await params;
  const incident = await acknowledgeIncident(id);

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
    message: "Incident acknowledged.",
    incident
  });
}
