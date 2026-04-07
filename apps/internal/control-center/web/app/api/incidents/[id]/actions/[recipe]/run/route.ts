import { actionRecipes } from "@ocos/contracts";
import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import {
  createCodexEscalation,
  evaluateEscalationNeed,
  getIncident,
  runAction
} from "@/lib/ocos-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; recipe: string }> }
) {
  if (!(await authorizeRequest(request))) {
    return unauthorizedResponse();
  }
  const { id, recipe } = await params;

  if (!actionRecipes.includes(recipe as (typeof actionRecipes)[number])) {
    return NextResponse.json(
      {
        message: `Unknown action recipe: ${recipe}`
      },
      {
        status: 400
      }
    );
  }

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

  const body = (await request.json().catch(() => ({}))) as { environmentSlug?: "staging" | "production" };
  const result = await runAction({
    incidentId: id,
    serviceSlug: incident.serviceSlug,
    environmentSlug: body.environmentSlug ?? incident.environmentSlug,
    recipe: recipe as (typeof actionRecipes)[number],
    requestedBy: "operator",
    reason: `Manual action for ${incident.title}`,
    metadata: {}
  });

  let escalationBundle = result.escalationBundle;
  if (!escalationBundle) {
    const escalation = await evaluateEscalationNeed(id);
    if (escalation.shouldEscalate) {
      escalationBundle = (await createCodexEscalation(id)).bundle;
    }
  }

  return NextResponse.json({
    message: result.actionRun.summary,
    actionRun: result.actionRun,
    incident: result.incident,
    escalationBundle
  });
}
