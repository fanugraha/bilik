import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextMentah = searchParams.get("next") ?? "/dashboard";
  // Hanya path internal; tolak "//situs-lain" atau "@situs-lain" yang bisa membelokkan ke domain lain
  const next = nextMentah.startsWith("/") && !nextMentah.startsWith("//") ? nextMentah : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Link tidak valid atau sudah kedaluwarsa")}`,
  );
}
