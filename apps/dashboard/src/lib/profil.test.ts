import { describe, expect, it } from "vitest";
import { cekKataSandiBaru, cekNamaGuru, namaMasihBawaan, punyaLoginEmail } from "./profil";

describe("namaMasihBawaan", () => {
  it("benar jika nama sama dengan bagian depan email", () => {
    expect(namaMasihBawaan("budi.s", "budi.s@gmail.com")).toBe(true);
  });

  it("benar jika nama kosong atau 'Guru'", () => {
    expect(namaMasihBawaan("", "budi@gmail.com")).toBe(true);
    expect(namaMasihBawaan("Guru", null)).toBe(true);
  });

  it("salah jika guru sudah mengisi nama sendiri", () => {
    expect(namaMasihBawaan("Budi Santoso", "budi.s@gmail.com")).toBe(false);
  });
});

describe("cekNamaGuru", () => {
  it("merapikan spasi", () => {
    expect(cekNamaGuru("  Budi  Santoso ")).toEqual({ nama: "Budi Santoso" });
  });

  it("merapikan huruf besar-kecil", () => {
    expect(cekNamaGuru("FAJAR ARI NUGRAHA")).toEqual({ nama: "Fajar Ari Nugraha" });
  });

  it("menolak nama kosong", () => {
    expect(cekNamaGuru("   ")).toEqual({ error: "Nama wajib diisi" });
  });

  it("menolak nama terlalu panjang", () => {
    expect(cekNamaGuru("a".repeat(101))).toEqual({ error: "Nama maksimal 100 karakter" });
  });
});

describe("cekKataSandiBaru", () => {
  it("menolak kata sandi kurang dari 8 karakter", () => {
    expect(cekKataSandiBaru("Rahas1a", "Rahas1a")).toBe("Kata sandi minimal 8 karakter");
  });

  it("menolak kata sandi lebih dari 72 karakter", () => {
    const panjang = "Aa1!" + "x".repeat(69);
    expect(cekKataSandiBaru(panjang, panjang)).toBe("Kata sandi maksimal 72 karakter");
  });

  it("wajib ada huruf kecil", () => {
    expect(cekKataSandiBaru("RAHASIA123!", "RAHASIA123!")).toBe("Kata sandi harus memuat huruf kecil");
  });

  it("wajib ada huruf besar", () => {
    expect(cekKataSandiBaru("rahasia123!", "rahasia123!")).toBe("Kata sandi harus memuat huruf besar");
  });

  it("wajib ada angka", () => {
    expect(cekKataSandiBaru("RahasiaSekali!", "RahasiaSekali!")).toBe("Kata sandi harus memuat angka");
  });

  it("menolak spasi di awal atau akhir", () => {
    expect(cekKataSandiBaru(" Rahasia123!", " Rahasia123!")).toBe("Kata sandi tidak boleh diawali atau diakhiri spasi");
  });

  it("menolak konfirmasi yang tidak cocok", () => {
    expect(cekKataSandiBaru("Rahasia123!", "Rahasia124!")).toBe("Konfirmasi kata sandi tidak cocok");
  });

  it("wajib ada simbol", () => {
    expect(cekKataSandiBaru("Rahasia123", "Rahasia123")).toBe("Kata sandi harus memuat simbol (contoh: ! @ # $ %)");
  });

  it("menolak kata sandi baru yang sama dengan kata sandi lama", () => {
    expect(cekKataSandiBaru("Rahasia123!", "Rahasia123!", "Rahasia123!")).toBe(
      "Kata sandi baru harus berbeda dari kata sandi lama",
    );
  });

  it("lolos jika valid", () => {
    expect(cekKataSandiBaru("Rahasia123!", "Rahasia123!")).toBeNull();
    expect(cekKataSandiBaru("Rahasia123!", "Rahasia123!", "LamaSekali9#")).toBeNull();
  });
});

describe("punyaLoginEmail", () => {
  it("benar untuk akun yang daftar lewat email", () => {
    expect(punyaLoginEmail({ app_metadata: { provider: "email", providers: ["email", "google"] } })).toBe(true);
  });

  it("salah untuk akun Google saja", () => {
    expect(punyaLoginEmail({ app_metadata: { provider: "google", providers: ["google"] } })).toBe(false);
  });
});
