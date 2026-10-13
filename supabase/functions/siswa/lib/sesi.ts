import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Ambil peserta + ujian dari token sesi. Null bila token tak dikenal. */
export async function pesertaDariToken(db: SupabaseClient, token: string) {
  const { data: peserta } = await db
    .from("peserta")
    .select("id, ujian_id, siswa_id, status, disetujui, selesai_at, tambahan_waktu, jumlah_pelanggaran")
    .eq("token_sesi", token)
    .maybeSingle();
  if (!peserta) return null;
  const { data: ujian } = await db
    .from("ujian")
    .select("id, judul, durasi, status, acak_soal, acak_opsi, batas_pelanggaran, selesai_at")
    .eq("id", peserta.ujian_id)
    .single();
  if (!ujian) return null;
  return { peserta, ujian };
}
