import { appEnv } from "@/lib/env";
import { hashToken } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export type AccessContext = {
  kind: "internal" | "operator" | "edge-trusted";
  subject: string;
};

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const headerToken = request.headers.get("x-ocos-token");
  if (headerToken) {
    return headerToken.trim();
  }

  return null;
}

export async function authorizeRequest(
  request: Request,
  options: { requireToken?: boolean } = {}
): Promise<AccessContext | null> {
  const internalToken = request.headers.get("x-ocos-internal-token");
  if (internalToken && internalToken === appEnv.internalApiToken) {
    return { kind: "internal", subject: "worker" };
  }

  const bearer = extractToken(request);
  if (bearer && bearer === appEnv.internalApiToken) {
    return { kind: "internal", subject: "worker" };
  }

  if (bearer) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const hashed = hashToken(bearer);
      const { data } = await supabase
        .from("operator_tokens")
        .select("label, revoked_at, expires_at")
        .eq("token_hash", hashed)
        .maybeSingle();

      if (data && !data.revoked_at) {
        const expired = data.expires_at ? new Date(data.expires_at).getTime() < Date.now() : false;
        if (!expired) {
          return { kind: "operator", subject: data.label };
        }
      }
    } else if (bearer === appEnv.demoOperatorToken) {
      return { kind: "operator", subject: "demo-operator" };
    }
  }

  if (!options.requireToken && appEnv.trustCloudflareAccess) {
    return { kind: "edge-trusted", subject: "cloudflare-access" };
  }

  return null;
}

export function unauthorizedResponse(): Response {
  return Response.json(
    {
      error: "unauthorized",
      message: "OCOS access requires Cloudflare Access, an operator PAT, or an internal token."
    },
    {
      status: 401
    }
  );
}
