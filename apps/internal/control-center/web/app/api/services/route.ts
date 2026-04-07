import { NextResponse } from "next/server";

import { listServices } from "@/lib/ocos-store";

export async function GET() {
  return NextResponse.json(await listServices());
}
