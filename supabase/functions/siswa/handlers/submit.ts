import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";
import { pesertaDariToken } from "../lib/sesi.ts";

/** Akhiri pengerjaan: peserta -> selesai. */
export async function submit(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status === "selesai") return balas({ ok: true });
  if (sesi.peserta.status !== "mengerjakan" && sesi.peserta.status !== "terkunci") {
    return balas({ error: "Ujian belum dimulai" }, 409);
  }
  const { error } = await db
    .from("peserta")
    .update({ status: "selesai", selesai_at: new Date().toISOString() })
    .eq("id", sesi.peserta.id);
  if (error) throw error;
  return balas({ ok: true });
}
