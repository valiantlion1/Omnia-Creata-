import { NextResponse } from "next/server";

import { getIncident } from "@/lib/ocos-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incident = await getIncident(id);

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

  return NextResponse.json(incident);
}
