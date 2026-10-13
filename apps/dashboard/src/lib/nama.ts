// Kata sambung nama yang lazim ditulis huruf kecil bila tidak di awal: "Ahmad bin Abdullah"
const KATA_SAMBUNG_KECIL = new Set(["bin", "binti"]);

// Merapikan huruf besar-kecil nama orang: tiap kata diawali kapital, sisanya kecil.
// Huruf setelah titik dan tanda hubung ikut kapital agar gelar tetap rapi (S.Pd., M.Pd.I,
// Siti-Aisyah); huruf setelah apostrof tidak (Ma'ruf).
export function rapikanNamaOrang(mentah: string) {
  const listKata = mentah.trim().split(/\s+/).filter(Boolean);

  return listKata
    .map((kata, indeks) => {
      const kecil = kata.toLocaleLowerCase("id");
      if (indeks > 0 && KATA_SAMBUNG_KECIL.has(kecil)) return kecil;
      return kecil.replace(/(^[^\p{L}]*|[.-])(\p{L})/gu, (_, awalan: string, huruf: string) => awalan + huruf.toLocaleUpperCase("id"));
    })
    .join(" ");
}
