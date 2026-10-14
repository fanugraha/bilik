import type { ReactNode } from "react";
import { Ikon } from "@/components/ui/ikon";

// Kerangka halaman siswa versi web. Mengikuti bahasa desain dashboard guru:
// tenang, kartu berbatas tipis, tanpa bayangan/gradien berat. Sumber token: globals.css.

export function MerekBilik({ terang = false }: { terang?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold ${terang ? "bg-white/15 text-white" : "bg-papan text-white"}`}>B</span>
      <span className={`text-lg font-extrabold tracking-tight ${terang ? "text-white" : "text-tinta"}`}>Bilik</span>
    </span>
  );
}

// Bilah atas tipis. `kanan` untuk timer/status, `judul` untuk konteks ujian.
export function BilahAtas({ judul, kanan }: { judul?: string; kanan?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-garis bg-permukaan">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <MerekBilik />
        {judul && (
          <>
            <span aria-hidden className="hidden h-5 w-px bg-garis-tegas sm:block" />
            <span className="hidden min-w-0 truncate text-sm font-semibold text-tinta-2 sm:block">{judul}</span>
          </>
        )}
        {kanan && <div className="ml-auto flex items-center gap-2">{kanan}</div>}
      </div>
    </header>
  );
}

// Penunjuk langkah 1-2-3, gaya sama dengan penanda langkah di dashboard.
export function LangkahUjian({ aktif, terang = false }: { aktif: number; terang?: boolean }) {
  const label = ["Kode ujian", "Nama", "Lobby"];
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Langkah masuk ujian">
      {label.map((teks, indeks) => {
        const nomor = indeks + 1;
        const sedang = nomor === aktif;
        const selesai = nomor < aktif;
        const kotak = sedang
          ? terang
            ? "border-white/40 bg-white/15"
            : "border-nila bg-nila-muda"
          : terang
            ? "border-white/20 bg-transparent"
            : "border-garis bg-permukaan";
        const lingkaran = sedang
          ? "bg-nila text-white"
          : selesai
            ? "bg-hijau text-white"
            : terang
              ? "bg-white/15 text-white/80"
              : "bg-kertas text-tinta-2";
        const tulisan = sedang ? (terang ? "text-white" : "text-nila") : terang ? "text-white/70" : "text-tinta-2";
        return (
          <li key={teks} className="flex items-center gap-2">
            <span className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${kotak}`} aria-current={sedang ? "step" : undefined}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${lingkaran}`}>
                {selesai ? <Ikon nama="centang" className="h-3 w-3" /> : nomor}
              </span>
              <span className={`text-sm font-semibold ${tulisan}`}>{teks}</span>
            </span>
            {indeks < label.length - 1 && <span aria-hidden className={`h-px w-4 ${terang ? "bg-white/25" : "bg-garis-tegas"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export function Kolom({ children, lebar = "max-w-2xl" }: { children: ReactNode; lebar?: string }) {
  return <div className={`mx-auto w-full ${lebar} px-4 py-8 sm:px-6`}>{children}</div>;
}

const TIPS = [
  "Siapkan koneksi internet yang stabil.",
  "Kerjakan sendiri; pindah tab tercatat sebagai pelanggaran.",
  "Jawaban tersimpan otomatis, tapi jangan tutup halaman.",
];

// Cangkang dua kolom untuk pendaftaran (kode & nama): panel merek kiri + konten kanan.
// Pola sama dengan halaman masuk dashboard (CangkangAuth).
export function CangkangSiswa({
  langkah,
  judul,
  deskripsi,
  children,
}: {
  langkah: number;
  judul: string;
  deskripsi: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-papan p-12 text-white lg:flex">
        <MerekBilik terang />
        <div>
          <p className="max-w-sm text-3xl font-bold leading-tight tracking-tight">Ruang ujian yang tenang, di peramban setiap siswa.</p>
          <div className="mt-8">
            <LangkahUjian aktif={langkah} terang />
          </div>
          <ul className="mt-8 space-y-3 text-sm text-white/75">
            {TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-3">
                <Ikon nama="info" className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/50">Versi web tanpa pemasangan. Untuk pengawasan penuh, gunakan aplikasi Android.</p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 lg:hidden">
          <MerekBilik />
        </div>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <LangkahUjian aktif={langkah} terang={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">{judul}</h1>
          <p className="mt-1.5 text-sm text-tinta-2">{deskripsi}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
