// Alur kerja guru: kelas -> siswa -> bank soal -> soal -> ujian.
// Dipakai Beranda untuk "Mulai dari sini" dan halaman lain untuk tombol langkah berikutnya.

import type { SupabaseClient } from "@supabase/supabase-js";

export type KondisiAlur = {
  jumlahKelas: number;
  kelasTanpaSiswaId: string | null;
  adaSiswa: boolean;
  bankPertamaId: string | null;
  adaSoal: boolean;
  adaUjian: boolean;
};

export type LangkahMulai = {
  judul: string;
  deskripsi: string;
  href: string;
  selesai: boolean;
  berikutnya: boolean;
};

export function susunLangkahMulai(kondisi: KondisiAlur): LangkahMulai[] {
  const listLangkah: Omit<LangkahMulai, "berikutnya">[] = [
    { judul: "Buat kelas", deskripsi: "Misalnya X IPA 1.", href: "/dashboard/kelas", selesai: kondisi.jumlahKelas > 0 },
    {
      judul: "Masukkan siswa",
      deskripsi: "Tempel daftar nama dari Excel.",
      href: kondisi.kelasTanpaSiswaId ? `/dashboard/kelas/${kondisi.kelasTanpaSiswaId}/siswa` : "/dashboard/kelas",
      selesai: kondisi.adaSiswa,
    },
    {
      judul: "Buat bank soal",
      deskripsi: "Satu bank per mapel atau bab.",
      href: "/dashboard/soal/bank/buat",
      selesai: kondisi.bankPertamaId !== null,
    },
    {
      judul: "Tulis soal",
      deskripsi: "PG, benar/salah, atau essay.",
      href: kondisi.bankPertamaId ? `/dashboard/soal/buat?bank=${kondisi.bankPertamaId}` : "/dashboard/soal/bank/buat",
      selesai: kondisi.adaSoal,
    },
    { judul: "Buat ujian", deskripsi: "Ambil soal dari bank, pilih kelas.", href: "/dashboard/ujian/buat", selesai: kondisi.adaUjian },
  ];

  const indeksBerikutnya = listLangkah.findIndex((langkah) => !langkah.selesai);
  return listLangkah.map((langkah, indeks) => ({ ...langkah, berikutnya: indeks === indeksBerikutnya }));
}

// Membaca keadaan data guru (satu RPC: ringkasan_guru) lalu mengembalikan langkah yang belum selesai.
// Dipakai sebagai aksi utama halaman agar tombol "Buat ujian" tidak muncul sebelum syaratnya ada:
// guru baru diarahkan ke langkah terdekat; guru yang datanya sudah cukup tetap bebas membuat ujian.
export async function ambilAksiAlur(supabase: SupabaseClient): Promise<LangkahMulai | null> {
  const { data } = await supabase.rpc("ringkasan_guru");
  const ringkas = (Array.isArray(data) ? data[0] : data) as
    | {
        jumlah_kelas: number;
        jumlah_siswa: number;
        jumlah_soal: number;
        jumlah_ujian: number;
        bank_pertama_id: string | null;
        kelas_tanpa_siswa_id: string | null;
      }
    | undefined;

  const listLangkah = susunLangkahMulai({
    jumlahKelas: ringkas?.jumlah_kelas ?? 0,
    kelasTanpaSiswaId: ringkas?.kelas_tanpa_siswa_id ?? null,
    adaSiswa: (ringkas?.jumlah_siswa ?? 0) > 0,
    bankPertamaId: ringkas?.bank_pertama_id ?? null,
    adaSoal: (ringkas?.jumlah_soal ?? 0) > 0,
    adaUjian: (ringkas?.jumlah_ujian ?? 0) > 0,
  });

  return listLangkah.find((langkah) => langkah.berikutnya) ?? null;
}

// Alamat "kembali ke" dari query/form hanya boleh halaman dashboard sendiri,
// agar tidak bisa dipakai membelokkan guru ke situs lain.
export function amankanTujuanKembali(nilai: string | null | undefined) {
  if (!nilai || !nilai.startsWith("/dashboard/") || nilai.startsWith("//")) return null;
  return nilai;
}
