import { NextResponse } from "next/server";

import { listProjects } from "@/lib/ocos-store";

export async function GET() {
  return NextResponse.json(await listProjects());
}
