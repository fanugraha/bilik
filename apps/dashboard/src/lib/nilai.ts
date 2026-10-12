import type { SupabaseClient } from "@supabase/supabase-js";

export type TipeSoal = "pg" | "essay" | "benar_salah";

export type SoalUjian = {
  soalId: string;
  urutan: number;
  bobot: number;
  tipe: TipeSoal;
  teks: string;
};

export type JawabanPeserta = {
  soalId: string;
  isi: string | null;
  skor: number | null;
};

export type BarisRekap = {
  pesertaId: string;
  nama: string;
  noAbsen: number | null;
  namaKelas: string;
  status: string;
  jumlahPelanggaran: number;
  skorOtomatis: number;
  skorEssay: number;
  essayBelumDikoreksi: number;
  totalSkor: number;
  nilai: number;
  listJawaban: JawabanPeserta[];
};

export type RekapNilai = {
  ujian: { id: string; judul: string; mapel: string | null; status: string };
  listSoal: SoalUjian[];
  skorMaksimal: number;
  listBaris: BarisRekap[];
};

type RelasiSatu<T> = T | T[] | null;

// Supabase bisa mengembalikan relasi sebagai objek atau array, tergantung tipe FK.
function ambilSatu<T>(relasi: RelasiSatu<T>): T | null {
  if (Array.isArray(relasi)) return relasi[0] ?? null;
  return relasi;
}

export async function ambilRekapNilai(
  supabase: SupabaseClient,
  ujianId: string,
  guruId: string,
): Promise<RekapNilai | null> {
  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, mapel, status")
    .eq("id", ujianId)
    .eq("guru_id", guruId)
    .single();

  if (!ujian) return null;

  const { data: dataSoalUjian } = await supabase
    .from("ujian_soal")
    .select("soal_id, urutan, bobot, soal:soal_id (tipe, teks)")
    .eq("ujian_id", ujianId)
    .order("urutan", { ascending: true });

  const listSoal: SoalUjian[] = (dataSoalUjian ?? []).map((baris) => {
    const soal = ambilSatu(baris.soal as RelasiSatu<{ tipe: TipeSoal; teks: string }>);
    return {
      soalId: baris.soal_id,
      urutan: baris.urutan,
      bobot: Number(baris.bobot),
      tipe: soal?.tipe ?? "essay",
      teks: soal?.teks ?? "",
    };
  });

  let skorMaksimal = 0;
  for (const soal of listSoal) skorMaksimal += soal.bobot;

  const { data: dataPeserta } = await supabase
    .from("peserta")
    .select("id, status, jumlah_pelanggaran, siswa:siswa_id (nama, no_absen, kelas:kelas_id (nama))")
    .eq("ujian_id", ujianId);

  const listPesertaId = (dataPeserta ?? []).map((peserta) => peserta.id);

  const { data: dataJawaban } = listPesertaId.length
    ? await supabase.from("jawaban").select("peserta_id, soal_id, isi, skor").in("peserta_id", listPesertaId)
    : { data: [] };

  const tipePerSoal = new Map(listSoal.map((soal) => [soal.soalId, soal.tipe]));

  const listBaris: BarisRekap[] = (dataPeserta ?? []).map((peserta) => {
    type DataSiswa = { nama: string; no_absen: number | null; kelas: RelasiSatu<{ nama: string }> };
    const siswa = ambilSatu(peserta.siswa as RelasiSatu<DataSiswa>);
    const kelas = siswa ? ambilSatu(siswa.kelas) : null;

    const listJawaban: JawabanPeserta[] = (dataJawaban ?? [])
      .filter((jawaban) => jawaban.peserta_id === peserta.id)
      .map((jawaban) => ({
        soalId: jawaban.soal_id,
        isi: jawaban.isi,
        skor: jawaban.skor === null ? null : Number(jawaban.skor),
      }));

    let skorOtomatis = 0;
    let skorEssay = 0;
    let essayBelumDikoreksi = 0;
    for (const jawaban of listJawaban) {
      const tipe = tipePerSoal.get(jawaban.soalId);
      if (tipe === "essay") {
        if (jawaban.skor === null) essayBelumDikoreksi++;
        else skorEssay += jawaban.skor;
      } else if (tipe) {
        skorOtomatis += jawaban.skor ?? 0;
      }
    }

    const totalSkor = skorOtomatis + skorEssay;
    const nilai = skorMaksimal > 0 ? Math.round((totalSkor / skorMaksimal) * 1000) / 10 : 0;

    return {
      pesertaId: peserta.id,
      nama: siswa?.nama ?? "-",
      noAbsen: siswa?.no_absen ?? null,
      namaKelas: kelas?.nama ?? "-",
      status: peserta.status,
      jumlahPelanggaran: peserta.jumlah_pelanggaran,
      skorOtomatis,
      skorEssay,
      essayBelumDikoreksi,
      totalSkor,
      nilai,
      listJawaban,
    };
  });

  listBaris.sort((a, b) => {
    if (a.namaKelas !== b.namaKelas) return a.namaKelas.localeCompare(b.namaKelas);
    return (a.noAbsen ?? 9999) - (b.noAbsen ?? 9999);
  });

  return { ujian, listSoal, skorMaksimal, listBaris };
}
