import { NextResponse } from "next/server";
import {
  getConfiguredAccountUrl,
  getConfiguredHostingTarget,
  getConfiguredSiteUrl,
  getDevicePipelineMode,
  getProductMode,
  isDeviceCredentialSecretConfigured,
  isDevicePipelineConfigured,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  isSupabasePublicConfigured
} from "@/lib/runtime";

export function GET() {
  return NextResponse.json({
    accountUrl: getConfiguredAccountUrl(),
    deviceCredentialSecretConfigured: isDeviceCredentialSecretConfigured(),
    devicePipelineConfigured: isDevicePipelineConfigured(),
    devicePipelineMode: getDevicePipelineMode(),
    hostingTarget: getConfiguredHostingTarget(),
    mode: getProductMode(),
    product: "Omnia Watch",
    siteUrl: getConfiguredSiteUrl(),
    supabaseAdminConfigured: isSupabaseAdminConfigured(),
    supabaseConfigured: isSupabaseConfigured(),
    supabasePublicConfigured: isSupabasePublicConfigured(),
    timestamp: new Date().toISOString()
  });
}
