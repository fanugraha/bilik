import { describe, expect, it } from "vitest";
import { amankanTujuanKembali, susunLangkahMulai, type KondisiAlur } from "./alur";

const kosong: KondisiAlur = {
  jumlahKelas: 0,
  kelasTanpaSiswaId: null,
  adaSiswa: false,
  bankPertamaId: null,
  adaSoal: false,
  adaUjian: false,
};

describe("susunLangkahMulai", () => {
  it("guru baru: langkah pertama 'Buat kelas' jadi langkah berikutnya", () => {
    const langkah = susunLangkahMulai(kosong);
    expect(langkah.map((l) => l.judul)).toEqual(["Buat kelas", "Masukkan siswa", "Buat bank soal", "Tulis soal", "Buat ujian"]);
    expect(langkah.filter((l) => l.berikutnya).map((l) => l.judul)).toEqual(["Buat kelas"]);
  });

  it("'Masukkan siswa' langsung ke kelas yang belum punya siswa", () => {
    const langkah = susunLangkahMulai({ ...kosong, jumlahKelas: 1, kelasTanpaSiswaId: "k1" });
    expect(langkah[1]).toMatchObject({ href: "/dashboard/kelas/k1/siswa", berikutnya: true, selesai: false });
  });

  it("'Tulis soal' langsung ke bank pertama", () => {
    const langkah = susunLangkahMulai({ ...kosong, jumlahKelas: 1, adaSiswa: true, bankPertamaId: "b1" });
    expect(langkah[2].selesai).toBe(true);
    expect(langkah[3]).toMatchObject({ href: "/dashboard/soal/buat?bank=b1", berikutnya: true });
  });

  it("tanpa bank, 'Tulis soal' mengarah ke pembuatan bank", () => {
    expect(susunLangkahMulai(kosong)[3].href).toBe("/dashboard/soal/bank/buat");
  });

  it("semua selesai: tidak ada langkah berikutnya", () => {
    const langkah = susunLangkahMulai({
      jumlahKelas: 1,
      kelasTanpaSiswaId: null,
      adaSiswa: true,
      bankPertamaId: "b1",
      adaSoal: true,
      adaUjian: true,
    });
    expect(langkah.every((l) => l.selesai && !l.berikutnya)).toBe(true);
  });
});

describe("amankanTujuanKembali", () => {
  it("menerima path internal dashboard", () => {
    expect(amankanTujuanKembali("/dashboard/ujian/u1/soal")).toBe("/dashboard/ujian/u1/soal");
  });

  it("menolak path luar, protokol relatif, dan kosong", () => {
    expect(amankanTujuanKembali("https://jahat.test")).toBeNull();
    expect(amankanTujuanKembali("//jahat.test/dashboard")).toBeNull();
    expect(amankanTujuanKembali("/login")).toBeNull();
    expect(amankanTujuanKembali("")).toBeNull();
    expect(amankanTujuanKembali(null)).toBeNull();
  });
});
