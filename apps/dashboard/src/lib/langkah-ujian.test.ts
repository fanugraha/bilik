import { describe, expect, it } from "vitest";
import { susunLangkahUjian } from "./langkah-ujian";

describe("susunLangkahUjian", () => {
  it("ujian baru (belum tersimpan): hanya langkah Info yang bisa dibuka", () => {
    const { listLangkah } = susunLangkahUjian(null);
    expect(listLangkah.map((l) => l.judul)).toEqual(["Info ujian", "Ambil soal dari bank", "Peserta & aturan", "Tinjau & buka lobby"]);
    expect(listLangkah.map((l) => l.href)).toEqual([null, null, null, null]);
  });

  it("draft tanpa soal & kelas: dua kekurangan, belum siap dibuka", () => {
    const hasil = susunLangkahUjian({ ujianId: "u1", jumlahSoal: 0, jumlahKelas: 0 });
    expect(hasil.siapDibuka).toBe(false);
    expect(hasil.kekurangan).toEqual([
      { teks: "Belum ada soal", href: "/dashboard/ujian/u1/soal" },
      { teks: "Belum ada kelas peserta", href: "/dashboard/ujian/u1/peserta" },
    ]);
    expect(hasil.listLangkah.map((l) => l.selesai)).toEqual([true, false, false, false]);
    expect(hasil.listLangkah[3].href).toBe("/dashboard/ujian/u1/tinjau");
  });

  it("soal dan kelas ada: siap dibuka", () => {
    const hasil = susunLangkahUjian({ ujianId: "u1", jumlahSoal: 5, jumlahKelas: 1 });
    expect(hasil.siapDibuka).toBe(true);
    expect(hasil.kekurangan).toEqual([]);
    expect(hasil.listLangkah.map((l) => l.selesai)).toEqual([true, true, true, true]);
  });
});
