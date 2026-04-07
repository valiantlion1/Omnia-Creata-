import { NextResponse } from "next/server";

import { listReports } from "@/lib/ocos-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scopeLevel = url.searchParams.get("scopeLevel") ?? undefined;
  const reportType = url.searchParams.get("reportType") ?? undefined;
  const projectSlug = url.searchParams.get("projectSlug") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "20");

  return NextResponse.json(
    await listReports({
      projectSlug,
      scopeLevel:
        scopeLevel === "project" || scopeLevel === "service" || scopeLevel === "incident"
          ? scopeLevel
          : undefined,
      reportType:
        reportType === "overview" ||
        reportType === "daily" ||
        reportType === "weekly" ||
        reportType === "incident_snapshot"
          ? reportType
          : undefined,
      limit: Number.isFinite(limit) ? limit : 20
    })
  );
}
