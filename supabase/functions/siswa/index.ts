// Edge function "siswa": satu pintu masuk app siswa (PRD Fase 3).
//
// Siswa tidak punya akun/Supabase auth. Semua akses lewat fungsi ini memakai
// service role, diverifikasi dengan token_sesi acak. RLS tabel tetap guru-saja,
// jadi siswa tak pernah menyentuh tabel langsung dan kunci/pedoman tak terkirim.
//
// Router tipis: tiap aksi ada di handlers/. Aksi: join, pilih, status, soal,
// simpan, submit, lapor, buka.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { join } from "./handlers/join.ts";
import { pilih } from "./handlers/pilih.ts";
import { status } from "./handlers/status.ts";
import { soal } from "./handlers/soal.ts";
import { simpan } from "./handlers/simpan.ts";
import { submit } from "./handlers/submit.ts";
import { lapor } from "./handlers/lapor.ts";
import { buka } from "./handlers/buka.ts";
import { buatKlien } from "./lib/db.ts";
import { balas, corsHeaders } from "./lib/http.ts";

type Handler = (db: SupabaseClient, body: Record<string, unknown>) => Promise<Response>;

const aksi: Record<string, Handler> = { join, pilih, status, soal, simpan, submit, lapor, buka };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return balas({ error: "Metode tidak didukung" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return balas({ error: "Body tidak valid" }, 400);
  }

  const handler = aksi[String(body.aksi)];
  if (!handler) return balas({ error: "Aksi tidak dikenal" }, 400);

  try {
    return await handler(buatKlien(), body);
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    return balas({ error: pesan }, 500);
  }
});
