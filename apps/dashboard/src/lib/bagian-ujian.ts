// Bagian ujian dibuat otomatis: satu bagian per tipe soal. Urutan bawaan PG -> Benar/Salah -> Essay;
// guru masih bisa menggeser urutan bagian. Siswa mengerjakan per bagian dan tidak bisa kembali.

export const URUTAN_TIPE = ["pg", "benar_salah", "angket", "essay"] as const;
export type TipeSoal = (typeof URUTAN_TIPE)[number];

export const NAMA_TIPE: Record<TipeSoal, string> = {
  pg: "Pilihan ganda",
  benar_salah: "Benar/Salah",
  angket: "Angket",
  essay: "Essay",
};

// Angket: skala setuju 1-4, tanpa kunci. Skor = nilai pilihan yang dipilih siswa.
export const ANGKET_PILIHAN = [
  { nilai: "4", teks: "Sangat setuju" },
  { nilai: "3", teks: "Setuju" },
  { nilai: "2", teks: "Tidak setuju" },
  { nilai: "1", teks: "Sangat tidak setuju" },
] as const;

export function adalahTipeSoal(nilai: string): nilai is TipeSoal {
  return (URUTAN_TIPE as readonly string[]).includes(nilai);
}

export function urutkanTipe(listTipe: string[]): TipeSoal[] {
  return URUTAN_TIPE.filter((tipe) => listTipe.includes(tipe));
}

export function hitungPerTipe(listSoal: { tipe: string }[]): Record<TipeSoal, number> {
  const jumlah: Record<TipeSoal, number> = { pg: 0, benar_salah: 0, angket: 0, essay: 0 };
  for (const soal of listSoal) if (adalahTipeSoal(soal.tipe)) jumlah[soal.tipe]++;
  return jumlah;
}
