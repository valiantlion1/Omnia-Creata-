import { NextResponse } from "next/server";

import { listIncidents } from "@/lib/ocos-store";

export async function GET() {
  return NextResponse.json(await listIncidents());
}
