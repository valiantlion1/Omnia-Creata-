import type { Route } from "next";
import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

export default function RefundPolicyRedirectPage() {
  redirect(`/${defaultLocale}/refund-policy` as Route);
}
