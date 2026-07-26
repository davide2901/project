import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Utente già gate-ato dal middleware: usa getSession (locale) invece di getUser
 * per non pagare un round-trip Auth a ogni cambio tab.
 */
export async function requireSessionUser() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return { supabase, user: session.user };
}
