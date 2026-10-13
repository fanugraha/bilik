import { describe, expect, it } from "vitest";
import { bacaDataImpor } from "./impor-siswa";

describe("bacaDataImpor", () => {
  it("merapikan huruf besar-kecil nama siswa", () => {
    const { listBaris } = bacaDataImpor("No\tNama\n1\tSITI AISYAH\n2\tbudi santoso", []);
    expect(listBaris.map((baris) => baris.nama)).toEqual(["Siti Aisyah", "Budi Santoso"]);
  });

  it("nama lama yang kapital semua ditandai untuk diperbarui", () => {
    const { listBaris } = bacaDataImpor("1\tsiti aisyah", [{ no_absen: 1, nama: "SITI AISYAH" }]);
    expect(listBaris[0]).toMatchObject({ nama: "Siti Aisyah", status: "perbarui" });
  });
});
