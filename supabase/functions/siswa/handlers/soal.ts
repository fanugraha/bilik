import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";
import { pesertaDariToken } from "../lib/sesi.ts";

type SoalRingkas = { id: string; tipe: string; teks: string; opsi: string[]; bobot: number };

/** Kirim soal ujian per bagian (tanpa kunci/pedoman/jawaban_benar) + jawaban tersimpan. */
export async function soal(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status !== "mengerjakan" && sesi.peserta.status !== "terkunci") {
    return balas({ error: "Ujian belum dimulai" }, 409);
  }

  const [{ data: sections, error: errorSection }, { data: relasi, error }] = await Promise.all([
    db
      .from("ujian_section")
      .select("id, urutan, judul, tipe")
      .eq("ujian_id", sesi.ujian.id)
      .order("urutan", { ascending: true }),
    db
      .from("ujian_soal")
      .select("urutan, section_id, soal:soal_id(id, tipe, teks, opsi, bobot)")
      .eq("ujian_id", sesi.ujian.id)
      .order("urutan", { ascending: true }),
  ]);
  if (errorSection) throw errorSection;
  if (error) throw error;

  const soalPerSection = new Map<string, SoalRingkas[]>();
  for (const r of relasi ?? []) {
    const s = Array.isArray(r.soal) ? r.soal[0] : r.soal;
    if (!s) continue;
    const daftar = soalPerSection.get(r.section_id as string) ?? [];
    daftar.push({ id: s.id, tipe: s.tipe, teks: s.teks, opsi: s.opsi ?? [], bobot: s.bobot });
    soalPerSection.set(r.section_id as string, daftar);
  }

  const daftarSection = (sections ?? []).map((sec) => ({
    id: sec.id,
    urutan: sec.urutan,
    judul: sec.judul,
    tipe: sec.tipe,
    soal: soalPerSection.get(sec.id) ?? [],
  }));

  // Soal tanpa bagian (section_id null) digabung jadi satu bagian di akhir.
  const tanpaBagian = soalPerSection.get(null as unknown as string) ?? [];
  if (tanpaBagian.length > 0) {
    daftarSection.push({ id: "tanpa-bagian", urutan: 999999, judul: "Tanpa bagian", tipe: "", soal: tanpaBagian });
  }

  const { data: jawaban } = await db
    .from("jawaban")
    .select("soal_id, isi, alasan, ragu_ragu")
    .eq("peserta_id", sesi.peserta.id);

  return balas({
    sections: daftarSection,
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
