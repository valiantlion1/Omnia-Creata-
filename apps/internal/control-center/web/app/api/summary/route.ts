import { NextResponse } from "next/server";

import { getSummary } from "@/lib/ocos-store";

export async function GET() {
  return NextResponse.json(await getSummary());
}
