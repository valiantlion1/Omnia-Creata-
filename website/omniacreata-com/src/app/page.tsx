import type { Route } from "next";
import { redirect } from "next/navigation";
import { defaultLocale, getLocalizedPath } from "@/i18n/config";

export default function RootPage() {
  redirect(getLocalizedPath(defaultLocale) as Route);
}
