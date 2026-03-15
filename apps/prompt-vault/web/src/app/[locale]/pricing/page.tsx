import { buildProductUrl } from "@prompt-vault/config";
import { permanentRedirect } from "next/navigation";

export default async function PricingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  permanentRedirect(buildProductUrl("pricing"));
}
