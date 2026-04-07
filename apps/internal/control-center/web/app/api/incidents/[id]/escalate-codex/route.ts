import { NextResponse } from "next/server";

import { authorizeRequest, unauthorizedResponse } from "@/lib/auth";
import { createCodexEscalation } from "@/lib/ocos-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeRequest(request))) {
    return unauthorizedResponse();
  }
  const { id } = await params;

  try {
    const escalation = await createCodexEscalation(id);
    return NextResponse.json({
      message: "Codex escalation bundle created.",
      bundle: escalation.bundle,
      actionRun: escalation.actionRun
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to create Codex escalation."
      },
      {
        status: 400
      }
    );
  }
}
