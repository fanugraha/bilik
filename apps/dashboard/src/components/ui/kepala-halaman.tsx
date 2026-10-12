import Link from "next/link";
import { ReactNode } from "react";
import { Ikon } from "@/components/ui/ikon";

type KepalaHalamanProps = {
  judul: string;
  deskripsi?: ReactNode;
  kembali?: { href: string; teks: string };
  aksi?: ReactNode;
};

export function KepalaHalaman({ judul, deskripsi, kembali, aksi }: KepalaHalamanProps) {
  return (
    <header className="mb-6">
      {kembali && (
        <Link
          href={kembali.href}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-tinta-2 hover:text-nila"
        >
          <Ikon nama="kembali" className="h-4 w-4" />
          {kembali.teks}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-tinta">{judul}</h1>
          {deskripsi && <p className="mt-1 max-w-2xl text-sm text-tinta-2">{deskripsi}</p>}
        </div>
        {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
      </div>
    </header>
  );
}
