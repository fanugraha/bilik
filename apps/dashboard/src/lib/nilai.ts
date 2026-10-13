import type { SupabaseClient } from "@supabase/supabase-js";
import { ambilSatu, type RelasiSatu } from "./relasi";

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
  alasan: string | null;
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

export type StatSoal = {
  soal: SoalUjian;
  benar: number; // PG & B/S: skor penuh
  salah: number; // PG & B/S: dijawab tapi belum penuh
  kosong: number; // tak dijawab
  belumDikoreksi: number; // essay yang belum diberi skor
  rataRataSkor: number | null; // rata-rata skor soal (yang sudah dinilai)
  persenBenar: number | null; // PG & B/S saja
};

// Ringkasan per soal untuk halaman nilai.
export function rekapPerSoal(listSoal: SoalUjian[], listBaris: BarisRekap[]): StatSoal[] {
  return listSoal.map((soal) => {
    let benar = 0;
    let salah = 0;
    let kosong = 0;
    let belumDikoreksi = 0;
    let jumlahSkor = 0;
    let jumlahDinilai = 0;

    for (const baris of listBaris) {
      const jawaban = baris.listJawaban.find((item) => item.soalId === soal.soalId);
      const kosongkan = !jawaban || jawaban.isi === null || jawaban.isi === "";

      if (soal.tipe === "essay") {
        if (kosongkan) kosong++;
        else if (jawaban!.skor === null) belumDikoreksi++;
        else {
          jumlahSkor += jawaban!.skor;
          jumlahDinilai++;
        }
        continue;
      }

      if (kosongkan) {
        kosong++;
      } else if ((jawaban!.skor ?? 0) >= soal.bobot) {
        benar++;
      } else {
        salah++;
      }
    }

    const dijawab = benar + salah + jumlahDinilai + belumDikoreksi;
    const rataRataSkor = jumlahDinilai > 0 ? Math.round((jumlahSkor / jumlahDinilai) * 100) / 100 : null;
    const persenBenar = soal.tipe === "essay" ? null : dijawab > 0 ? Math.round((benar / dijawab) * 1000) / 10 : 0;

    return { soal, benar, salah, kosong, belumDikoreksi, rataRataSkor, persenBenar };
  });
}

export type SebaranNilai = { label: string; jumlah: number };

// Sebaran nilai 0-100 dalam 10 rentang, untuk histogram.
export function sebaranNilai(listBaris: BarisRekap[]): SebaranNilai[] {
  const label = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-100"];
  const jumlah = new Array(10).fill(0);
  for (const baris of listBaris) {
    const indeks = Math.min(9, Math.max(0, Math.floor(baris.nilai / 10)));
    jumlah[indeks]++;
  }
  return label.map((teks, i) => ({ label: teks, jumlah: jumlah[i] }));
}

/** Rata-rata nilai (1 desimal). */
export function rataRataNilai(listBaris: BarisRekap[]): number {
  if (listBaris.length === 0) return 0;
  let jumlah = 0;
  for (const baris of listBaris) jumlah += baris.nilai;
  return Math.round((jumlah / listBaris.length) * 10) / 10;
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
    ? await supabase.from("jawaban").select("peserta_id, soal_id, isi, alasan, skor").in("peserta_id", listPesertaId)
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
        alasan: jawaban.alasan,
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
