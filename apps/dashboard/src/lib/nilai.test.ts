import { describe, expect, it } from "vitest";
import { lulus, rekapPerSoal, sebaranNilai, skorMaksSoal, type BarisRekap, type JawabanPeserta, type SoalUjian } from "./nilai";

function soal(partial: Partial<SoalUjian> & Pick<SoalUjian, "soalId" | "tipe">): SoalUjian {
  return { urutan: 1, bobot: 1, teks: "", ...partial };
}

function baris(partial: Partial<BarisRekap> & Pick<BarisRekap, "pesertaId">): BarisRekap {
  return {
    nama: partial.pesertaId,
    noAbsen: null,
    namaKelas: "8A",
    status: "selesai",
    jumlahPelanggaran: 0,
    skorOtomatis: 0,
    skorManual: 0,
    belumDinilai: 0,
    totalSkor: 0,
    nilai: 0,
    listJawaban: [],
    ...partial,
  };
}

function jawaban(soalId: string, isi: string | null, skor: number | null): JawabanPeserta {
  return { soalId, isi, alasan: null, skor };
}

describe("rekapPerSoal", () => {
  const listSoal: SoalUjian[] = [
    soal({ soalId: "q1", tipe: "pg", urutan: 1, bobot: 1 }),
    soal({ soalId: "q2", tipe: "benar_salah", urutan: 2, bobot: 1 }),
    soal({ soalId: "q3", tipe: "essay", urutan: 3, bobot: 5 }),
  ];

  const listBaris: BarisRekap[] = [
    baris({
      pesertaId: "A",
      listJawaban: [jawaban("q1", "A", 1), jawaban("q2", "benar", 0), jawaban("q3", "jawab", null)],
    }),
    baris({
      pesertaId: "B",
      listJawaban: [jawaban("q1", "B", 1), jawaban("q2", "salah", 1), jawaban("q3", "jawab", 5)],
    }),
    baris({ pesertaId: "C", listJawaban: [] }),
  ];

  const stat = rekapPerSoal(listSoal, listBaris);

  it("PG saja yang dihitung benar/salah", () => {
    expect(stat[0].benar).toBe(2);
    expect(stat[0].salah).toBe(0);
    expect(stat[0].kosong).toBe(1);
    expect(stat[0].persenBenar).toBe(100);
  });

  it("Benar/Salah dinilai manual: rata-rata skor, tanpa % benar", () => {
    expect(stat[1].rataRataSkor).toBe(0.5);
    expect(stat[1].belumDikoreksi).toBe(0);
    expect(stat[1].persenBenar).toBeNull();
  });

  it("menghitung essay: kosong, belum dikoreksi, rata-rata, tanpa % benar", () => {
    expect(stat[2].kosong).toBe(1);
    expect(stat[2].belumDikoreksi).toBe(1);
    expect(stat[2].rataRataSkor).toBe(5);
    expect(stat[2].persenBenar).toBeNull();
  });

  it("menghitung skor parsial (< bobot) sebagai salah", () => {
    const hasil = rekapPerSoal(
      [soal({ soalId: "x", tipe: "pg", bobot: 2 })],
      [baris({ pesertaId: "D", listJawaban: [jawaban("x", "A", 1)] })],
    );
    expect(hasil[0].salah).toBe(1);
    expect(hasil[0].benar).toBe(0);
  });

  it("angket dinilai manual: rata-rata skor, tanpa % benar", () => {
    const hasil = rekapPerSoal(
      [soal({ soalId: "a", tipe: "angket", bobot: 4 })],
      [
        baris({ pesertaId: "A", listJawaban: [jawaban("a", "4", 4)] }),
        baris({ pesertaId: "B", listJawaban: [jawaban("a", "2", 2)] }),
        baris({ pesertaId: "C", listJawaban: [] }),
      ],
    );
    expect(hasil[0].rataRataSkor).toBe(3);
    expect(hasil[0].persenBenar).toBeNull();
    expect(hasil[0].kosong).toBe(1);
  });
});

describe("skorMaksSoal", () => {
  it("skor maks = bobot untuk semua tipe (termasuk angket)", () => {
    expect(skorMaksSoal({ tipe: "angket", bobot: 4 })).toBe(4);
    expect(skorMaksSoal({ tipe: "pg", bobot: 2 })).toBe(2);
  });
});

describe("lulus", () => {
  it("lulus saat nilai mencapai KKM (termasuk tepat di KKM)", () => {
    expect(lulus(70, 70)).toBe(true);
    expect(lulus(69.9, 70)).toBe(false);
    expect(lulus(100, 70)).toBe(true);
  });
});

describe("sebaranNilai", () => {
  it("mengelompokkan nilai ke 10 rentang", () => {
    const hasil = sebaranNilai([
      baris({ pesertaId: "a", nilai: 95 }),
      baris({ pesertaId: "b", nilai: 85 }),
      baris({ pesertaId: "c", nilai: 5 }),
    ]);
    expect(hasil).toHaveLength(10);
    expect(hasil[9].jumlah).toBe(1); // 90-100
    expect(hasil[8].jumlah).toBe(1); // 80-89
    expect(hasil[0].jumlah).toBe(1); // 0-9
  });

  it("nilai 100 masuk rentang teratas, bukan di luar", () => {
    const hasil = sebaranNilai([baris({ pesertaId: "a", nilai: 100 })]);
    expect(hasil[9].jumlah).toBe(1);
    expect(hasil.reduce((total, item) => total + item.jumlah, 0)).toBe(1);
  });
});
