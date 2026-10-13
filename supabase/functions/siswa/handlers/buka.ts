import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";
import { pesertaDariToken } from "../lib/sesi.ts";

/** Buka kunci dengan kode sekali pakai dari guru (PRD 6) + rate limit. */
export async function buka(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const kode = String(body.kode ?? "").trim().toUpperCase();
  if (!kode) return balas({ error: "Masukkan kode buka" }, 400);

  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status !== "terkunci") return balas({ ok: true, status: sesi.peserta.status });

  // Rate limit: maksimal 5 percobaan per menit per peserta.
  const { count } = await db
    .from("percobaan_buka")
    .select("id", { count: "exact", head: true })
    .eq("peserta_id", sesi.peserta.id)
    .gte("waktu", new Date(Date.now() - 60000).toISOString());
  if ((count ?? 0) >= 5) {
    return balas({ error: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." }, 429);
  }
  await db.from("percobaan_buka").insert({ peserta_id: sesi.peserta.id });

  const { data: baris } = await db
    .from("kode_buka")
    .select("id, kode, kedaluwarsa_at")
    .eq("peserta_id", sesi.peserta.id)
    .eq("dipakai", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!baris) return balas({ error: "Belum ada kode buka dari guru" }, 404);
  if (new Date(baris.kedaluwarsa_at).getTime() < Date.now()) return balas({ error: "Kode buka sudah kedaluwarsa" }, 410);
  if (String(baris.kode).trim().toUpperCase() !== kode) return balas({ error: "Kode buka salah" }, 400);

  const { error: errorKode } = await db.from("kode_buka").update({ dipakai: true }).eq("id", baris.id);
  if (errorKode) throw errorKode;

  const { error: errorPeserta } = await db.from("peserta").update({ status: "mengerjakan" }).eq("id", sesi.peserta.id);
  if (errorPeserta) throw errorPeserta;

  return balas({ ok: true, status: "mengerjakan" });
}
