import { isLocale } from "@omnia-watch/i18n";
import { notFound, redirect } from "next/navigation";
import { localizePath } from "@/lib/site";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  redirect(localizePath(locale, "/app"));
}
