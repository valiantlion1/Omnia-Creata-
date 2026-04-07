import { appEnv } from "@/lib/env";

export async function dispatchStudioWorkflow(input: {
  recipe: string;
  incidentId?: string;
  serviceSlug: string;
  environmentSlug: string;
  hooksBaseUrl?: string;
}): Promise<{ queued: boolean; summary: string; runUrl?: string }> {
  if (!process.env.OCOS_GITHUB_TOKEN || !appEnv.githubRepo) {
    return {
      queued: false,
      summary: "GitHub workflow dispatch is not configured yet."
    };
  }

  const response = await fetch(
    `https://api.github.com/repos/${appEnv.githubRepo}/actions/workflows/${appEnv.githubWorkflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.OCOS_GITHUB_TOKEN}`,
        "User-Agent": "ocos-web/0.1"
      },
      body: JSON.stringify({
        ref: appEnv.githubRef,
        inputs: {
          action_recipe: input.recipe,
          incident_id: input.incidentId ?? "",
          service_slug: input.serviceSlug,
          environment_slug: input.environmentSlug,
          hooks_base_url: input.hooksBaseUrl ?? appEnv.hooksBaseUrl
        }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    return {
      queued: false,
      summary: `GitHub dispatch failed with ${response.status}: ${body.slice(0, 240)}`
    };
  }

  return {
    queued: true,
    summary: `GitHub workflow ${appEnv.githubWorkflowId} dispatched for ${input.recipe}.`,
    runUrl: `https://github.com/${appEnv.githubRepo}/actions/workflows/${appEnv.githubWorkflowId}`
  };
}
