// Wizard menyiapkan ujian: Info -> Ambil soal dari bank -> Peserta & aturan -> Tinjau & buka lobby.
// Semua langkah menyimpan ke draft yang sama, jadi guru bebas melompat lewat penanda langkah.

export type KunciLangkahUjian = "info" | "soal" | "peserta" | "tinjau";

export type LangkahUjian = {
  kunci: KunciLangkahUjian;
  judul: string;
  // null: ujian belum tersimpan, langkah belum bisa dibuka
  href: string | null;
  selesai: boolean;
};

export type KondisiUjian = { ujianId: string; jumlahSoal: number; jumlahKelas: number };

export function susunLangkahUjian(kondisi: KondisiUjian | null) {
  const dasar = kondisi ? `/dashboard/ujian/${kondisi.ujianId}` : null;
  const adaSoal = (kondisi?.jumlahSoal ?? 0) > 0;
  const adaKelas = (kondisi?.jumlahKelas ?? 0) > 0;

  const kekurangan: { teks: string; href: string }[] = [];
  if (dasar && !adaSoal) kekurangan.push({ teks: "Belum ada soal", href: `${dasar}/soal` });
  if (dasar && !adaKelas) kekurangan.push({ teks: "Belum ada kelas peserta", href: `${dasar}/peserta` });
  const siapDibuka = kondisi !== null && kekurangan.length === 0;

  const listLangkah: LangkahUjian[] = [
    { kunci: "info", judul: "Info ujian", href: dasar ? `${dasar}/ubah` : null, selesai: kondisi !== null },
    { kunci: "soal", judul: "Ambil soal dari bank", href: dasar ? `${dasar}/soal` : null, selesai: adaSoal },
    { kunci: "peserta", judul: "Peserta & aturan", href: dasar ? `${dasar}/peserta` : null, selesai: adaKelas },
    { kunci: "tinjau", judul: "Tinjau & buka lobby", href: dasar ? `${dasar}/tinjau` : null, selesai: siapDibuka },
  ];

  return { listLangkah, kekurangan, siapDibuka };
}
