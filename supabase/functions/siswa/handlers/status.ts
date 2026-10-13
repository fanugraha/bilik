import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";

/** Pantau status peserta + ujian (dipakai lobby & heartbeat). */
export async function status(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  if (!token) return balas({ error: "Sesi tidak valid" }, 400);

  const { data: peserta, error } = await db
    .from("peserta")
    .select("id, ujian_id, siswa_id, status, disetujui, jumlah_pelanggaran, tambahan_waktu, mulai_at, selesai_at")
    .eq("token_sesi", token)
    .maybeSingle();
  if (error) throw error;
  // Baris dihapus = siswa ditolak guru: app kembali ke pilih nama.
  if (!peserta) return balas({ ditolak: true });

  const { data: ujian } = await db
    .from("ujian")
    .select("id, judul, durasi, status, mulai_at, selesai_at, batas_pelanggaran")
    .eq("id", peserta.ujian_id)
    .single();

  return balas({ peserta, ujian });
}
