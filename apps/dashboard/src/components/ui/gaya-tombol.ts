// Kelas Tailwind tombol, dipakai bersama oleh <Tombol> (button) dan <TautanTombol> (link)
export type JenisTombol = "utama" | "kedua" | "bahaya" | "hantu";
export type UkuranTombol = "kecil" | "sedang" | "besar";

const warnaTombol: Record<JenisTombol, string> = {
  utama: "bg-nila text-white hover:bg-nila-tua",
  kedua: "border border-garis-tegas bg-permukaan text-tinta hover:bg-kertas",
  bahaya: "bg-merah text-white hover:bg-[#912018]",
  hantu: "text-tinta-2 hover:bg-kertas hover:text-tinta",
};

const ukuranTombol: Record<UkuranTombol, string> = {
  kecil: "h-8 gap-1.5 px-3 text-xs",
  sedang: "h-10 gap-2 px-4 text-sm",
  besar: "h-12 gap-2 px-5 text-base",
};

export function kelasTombol(jenis: JenisTombol = "utama", ukuran: UkuranTombol = "sedang") {
  return `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${warnaTombol[jenis]} ${ukuranTombol[ukuran]}`;
}
