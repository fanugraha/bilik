import { describe, expect, it } from "vitest";
import { rapikanNamaOrang } from "./nama";

describe("rapikanNamaOrang", () => {
  it("merapikan nama kapital semua", () => {
    expect(rapikanNamaOrang("FAJAR ARI NUGRAHA")).toBe("Fajar Ari Nugraha");
  });

  it("merapikan nama huruf kecil semua", () => {
    expect(rapikanNamaOrang("fajar ari nugraha")).toBe("Fajar Ari Nugraha");
  });

  it("merapikan nama campuran", () => {
    expect(rapikanNamaOrang("fAJAR ari NuGraha")).toBe("Fajar Ari Nugraha");
  });

  it("merapikan spasi berlebih", () => {
    expect(rapikanNamaOrang("  siti   aisyah ")).toBe("Siti Aisyah");
  });

  it("menjaga format gelar dan singkatan bertitik", () => {
    expect(rapikanNamaOrang("budi santoso, s.pd.")).toBe("Budi Santoso, S.Pd.");
    expect(rapikanNamaOrang("DR. IR. BUDI, M.PD.I")).toBe("Dr. Ir. Budi, M.Pd.I");
    expect(rapikanNamaOrang("m. rizky")).toBe("M. Rizky");
  });

  it("kapital setelah tanda hubung, tidak setelah apostrof", () => {
    expect(rapikanNamaOrang("siti-aisyah MA'RUF")).toBe("Siti-Aisyah Ma'ruf");
  });

  it("bin/binti tetap huruf kecil di tengah nama", () => {
    expect(rapikanNamaOrang("AHMAD BIN ABDULLAH")).toBe("Ahmad bin Abdullah");
    expect(rapikanNamaOrang("binti sari")).toBe("Binti Sari");
  });

  it("string kosong tetap kosong", () => {
    expect(rapikanNamaOrang("   ")).toBe("");
  });
});
