import type { Route } from "next";
import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

export default function PricingRedirectPage() {
  redirect(`/${defaultLocale}/pricing` as Route);
}
