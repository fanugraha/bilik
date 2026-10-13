import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";
import { pesertaDariToken } from "../lib/sesi.ts";

/** Autosave jawaban (upsert per peserta+soal). */
export async function simpan(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const soalId = String(body.soal_id ?? "");
  const isi = body.isi == null ? null : String(body.isi);
  const alasan = body.alasan == null ? null : (String(body.alasan).trim() || null);
  const raguRagu = body.ragu_ragu === true;
  if (!soalId) return balas({ error: "Soal tidak valid" }, 400);

  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status !== "mengerjakan") return balas({ error: "Ujian tidak sedang dikerjakan" }, 409);

  const { data: relasi } = await db
    .from("ujian_soal")
    .select("soal_id")
    .eq("ujian_id", sesi.ujian.id)
    .eq("soal_id", soalId)
    .maybeSingle();
  if (!relasi) return balas({ error: "Soal bukan bagian ujian ini" }, 400);

  const { error } = await db.from("jawaban").upsert(
    { peserta_id: sesi.peserta.id, soal_id: soalId, isi, alasan, ragu_ragu: raguRagu, diterima_at: new Date().toISOString() },
    { onConflict: "peserta_id,soal_id" },
  );
  if (error) throw error;
  return balas({ ok: true });
}
