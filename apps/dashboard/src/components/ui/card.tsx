import { ReactNode } from "react";

type KartuProps = {
  children: ReactNode;
  judul?: string;
  deskripsi?: ReactNode;
  aksi?: ReactNode;
  tanpaPadding?: boolean;
  className?: string;
};

// Panel putih berbatas tipis. Judul/aksi opsional membentuk kepala panel.
export function Kartu({ children, judul, deskripsi, aksi, tanpaPadding = false, className = "" }: KartuProps) {
  const adaKepala = judul || aksi;

  return (
    <section className={`rounded-xl border border-garis bg-permukaan ${className}`}>
      {adaKepala && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-garis px-5 py-4">
          <div className="min-w-0">
            {judul && <h2 className="text-base font-semibold text-tinta">{judul}</h2>}
            {deskripsi && <p className="mt-0.5 text-sm text-tinta-2">{deskripsi}</p>}
          </div>
          {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
        </div>
      )}
      <div className={tanpaPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}
