import { buildProductUrl } from "@prompt-vault/config";
import { permanentRedirect } from "next/navigation";

export default async function FeaturesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  permanentRedirect(buildProductUrl("features"));
}
