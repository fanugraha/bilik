import type { ReactNode } from "react";

// Ikon garis sederhana (24x24, stroke). Ditulis langsung agar tidak menambah dependensi.
type NamaIkon =
  | "beranda"
  | "kelas"
  | "soal"
  | "ujian"
  | "keluar"
  | "menu"
  | "lainnya"
  | "tutup"
  | "tambah"
  | "layar-penuh"
  | "centang"
  | "peringatan"
  | "info"
  | "kunci"
  | "jam"
  | "unduh"
  | "kembali"
  | "lanjut"
  | "cari"
  | "putar"
  | "google";

const jalurIkon: Record<NamaIkon, ReactNode> = {
  beranda: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  kelas: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" />
    </>
  ),
  soal: (
    <>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M8.5 12.5h7M8.5 16.5h5" />
    </>
  ),
  ujian: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4V2.8h6V4M8.5 11l2 2 4-4M8.5 17h7" />
    </>
  ),
  keluar: <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h10" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  lainnya: (
    <>
      <circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  tutup: <path d="M6 6l12 12M18 6 6 18" />,
  tambah: <path d="M12 5v14M5 12h14" />,
  "layar-penuh": <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  centang: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  peringatan: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.7v.3" />
    </>
  ),
  kunci: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  jam: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  unduh: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />,
  kembali: <path d="M14.5 6 8.5 12l6 6" />,
  lanjut: <path d="m9.5 6 6 6-6 6" />,
  cari: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  putar: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5" />,
  google: (
    <>
      <path d="M21.6 12.23A9.6 9.6 0 1 1 18.9 5.6" />
      <path d="M21.6 12.23h-9.6" />
    </>
  ),
};

type IkonProps = {
  nama: NamaIkon;
  className?: string;
};

export function Ikon({ nama, className = "h-5 w-5" }: IkonProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {jalurIkon[nama]}
    </svg>
  );
}

export type { NamaIkon };
