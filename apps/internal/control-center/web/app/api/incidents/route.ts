import { NextResponse } from "next/server";

import { listIncidents } from "@/lib/ocos-store";

export async function GET(request: Request) {
  const projectSlug = new URL(request.url).searchParams.get("projectSlug") ?? undefined;
  return NextResponse.json(await listIncidents(projectSlug));
}
