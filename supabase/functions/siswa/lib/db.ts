import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Klien Supabase service role untuk edge function `siswa`. */
export function buatKlien(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}
