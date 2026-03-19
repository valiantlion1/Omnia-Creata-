import { redirect } from "next/navigation";
import { localizeHref } from "@/lib/locale";

export default async function AppCollectionsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect(localizeHref(locale as "en" | "tr", "/app/projects"));
}
