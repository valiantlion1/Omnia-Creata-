import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getServerAuthState(): Promise<{
  enabled: boolean;
  user: User | null;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      enabled: false,
      user: null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return {
    enabled: true,
    user
  };
}
