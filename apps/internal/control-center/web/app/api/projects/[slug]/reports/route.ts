import { NextResponse } from "next/server";

import { listReports, upsertProjectOverviewReport, upsertProjectPeriodicReport } from "@/lib/ocos-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const reportType = url.searchParams.get("reportType") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "20");

  await upsertProjectOverviewReport(slug);
  await upsertProjectPeriodicReport(slug, "daily");
  await upsertProjectPeriodicReport(slug, "weekly");

  return NextResponse.json(
    await listReports({
      projectSlug: slug,
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
