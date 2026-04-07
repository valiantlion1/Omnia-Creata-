import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import { getSummary } from "@/lib/ocos-store";

export async function GET(request: Request) {
  if (!(await authorizeRequest(request, { requireToken: true }))) {
    return unauthorizedResponse();
  }
  const summary = await getSummary();

  return NextResponse.json({
    generatedAt: summary.generatedAt,
    organizationTotals: summary.organizationTotals,
    projects: summary.projects,
    serviceTotals: summary.serviceTotals,
    incidentsBySeverity: summary.incidentsBySeverity,
    activeIncidents: summary.activeIncidents.slice(0, 5),
    latestReports: summary.latestReports.slice(0, 5)
  });
}
