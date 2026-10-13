import { describe, expect, it } from "vitest";
import { hitungPerTipe, urutkanTipe } from "./bagian-ujian";

describe("urutkanTipe", () => {
  it("mengikuti urutan baku PG, benar/salah, essay dan membuang tipe tak dikenal", () => {
    expect(urutkanTipe(["essay", "pg", "lain", "pg"])).toEqual(["pg", "essay"]);
    expect(urutkanTipe(["benar_salah", "essay", "pg"])).toEqual(["pg", "benar_salah", "essay"]);
  });
});

describe("hitungPerTipe", () => {
  it("menghitung soal per tipe, tipe tanpa soal bernilai 0", () => {
    expect(hitungPerTipe([{ tipe: "pg" }, { tipe: "pg" }, { tipe: "essay" }])).toEqual({ pg: 2, benar_salah: 0, essay: 1 });
  });
});
