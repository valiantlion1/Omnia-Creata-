import type { Route } from "next";
import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

type LegacyProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LegacyProductPage({
  params,
}: LegacyProductPageProps) {
  const { slug } = await params;
  redirect(`/${defaultLocale}/products/${slug}` as Route);
}
