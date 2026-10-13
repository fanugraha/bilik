import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";
import { pesertaDariToken } from "../lib/sesi.ts";

/** Kirim soal ujian tanpa kunci/pedoman/jawaban_benar (PRD 7) + jawaban tersimpan. */
export async function soal(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status !== "mengerjakan" && sesi.peserta.status !== "terkunci") {
    return balas({ error: "Ujian belum dimulai" }, 409);
  }

  const { data: relasi, error } = await db
    .from("ujian_soal")
    .select("urutan, soal:soal_id(id, tipe, teks, opsi, bobot)")
    .eq("ujian_id", sesi.ujian.id)
    .order("urutan", { ascending: true });
  if (error) throw error;

  const daftar = (relasi ?? [])
    .map((r) => {
      const s = Array.isArray(r.soal) ? r.soal[0] : r.soal;
      if (!s) return null;
      return { id: s.id, tipe: s.tipe, teks: s.teks, opsi: s.opsi ?? [], bobot: s.bobot };
    })
    .filter((s) => s !== null);

  const { data: jawaban } = await db
    .from("jawaban")
    .select("soal_id, isi, ragu_ragu")
    .eq("peserta_id", sesi.peserta.id);

  return balas({
    soal: daftar,
    jawaban: jawaban ?? [],
    peserta: {
      status: sesi.peserta.status,
      selesai_at: sesi.peserta.selesai_at,
      tambahan_waktu: sesi.peserta.tambahan_waktu,
      jumlah_pelanggaran: sesi.peserta.jumlah_pelanggaran,
    },
    ujian: {
      judul: sesi.ujian.judul,
      durasi: sesi.ujian.durasi,
      acak_soal: sesi.ujian.acak_soal,
      acak_opsi: sesi.ujian.acak_opsi,
      status: sesi.ujian.status,
      selesai_at: sesi.ujian.selesai_at,
    },
  });
}
