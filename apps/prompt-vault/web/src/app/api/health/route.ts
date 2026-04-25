import { NextResponse } from "next/server";
import {
  areAdsEnabled,
  env,
  isAIEnabled,
  isProEnabled,
  isSupabaseAdminConfigured,
  isSupabaseConfigured
} from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "omniaprompt-web",
      appName: env.appName,
      mode: isSupabaseConfigured ? "cloud" : "local",
      checks: {
        webRuntime: true,
        supabaseConfigured: isSupabaseConfigured,
        supabaseAdminConfigured: isSupabaseAdminConfigured,
        aiEnabled: isAIEnabled,
        adsEnabled: areAdsEnabled,
        proEnabled: isProEnabled
      },
      generatedAt: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
