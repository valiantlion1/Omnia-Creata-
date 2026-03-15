import { redirect } from "next/navigation";
import { getServerAuthState } from "@/lib/server-auth";

export default async function RootPage() {
  const { enabled, user } = await getServerAuthState();

  redirect(enabled && user ? "/en/app" : "/en");
}
