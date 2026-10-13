import { ReactNode } from "react";

type CangkangAuthProps = {
  judul: string;
  deskripsi: string;
  children: ReactNode;
  kaki?: ReactNode;
};

const langkahUjian = ["Susun soal di bank soal", "Buka lobby, siswa masuk dengan kode", "Pantau kelas langsung dari satu layar", "PG dinilai otomatis, essay dikoreksi"];

// Kerangka halaman masuk/daftar: panel merek di kiri (desktop), form di kanan
export function CangkangAuth({ judul, deskripsi, children, kaki }: CangkangAuthProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-papan p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base font-extrabold text-papan">B</span>
          <span className="text-xl font-extrabold tracking-tight">Bilik</span>
        </div>
        <div>
          <p className="max-w-sm text-3xl font-bold leading-tight tracking-tight">Ruang ujian yang tenang, di HP setiap siswa.</p>
          <ol className="mt-8 space-y-3 text-sm text-white/75">
            {langkahUjian.map((langkah, indeks) => (
              <li key={langkah} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold text-white">
                  {indeks + 1}
                </span>
                {langkah}
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-white/50">Dashboard guru Bilik</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-papan text-sm font-extrabold text-white">B</span>
            <span className="text-lg font-extrabold tracking-tight">Bilik</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">{judul}</h1>
          <p className="mt-1.5 text-sm text-tinta-2">{deskripsi}</p>
          <div className="mt-8">{children}</div>
          {kaki && <div className="mt-8 text-sm text-tinta-2">{kaki}</div>}
        </div>
      </main>
    </div>
  );
}
