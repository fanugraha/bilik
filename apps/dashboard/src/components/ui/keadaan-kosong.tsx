import { ReactNode } from "react";
import { Ikon, type NamaIkon } from "@/components/ui/ikon";

type KeadaanKosongProps = {
  ikon: NamaIkon;
  judul: string;
  deskripsi: string;
  aksi?: ReactNode;
};

// Layar kosong selalu memberi tahu langkah berikutnya
export function KeadaanKosong({ ikon, judul, deskripsi, aksi }: KeadaanKosongProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-nila-muda text-nila">
        <Ikon nama={ikon} className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-tinta">{judul}</h3>
      <p className="mt-1 max-w-sm text-sm text-tinta-2">{deskripsi}</p>
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  );
}
