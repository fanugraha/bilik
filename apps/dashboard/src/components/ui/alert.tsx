import { ReactNode } from "react";
import { Ikon, type NamaIkon } from "@/components/ui/ikon";

type JenisPesan = "error" | "sukses" | "info" | "peringatan";

type PesanProps = {
  children: ReactNode;
  jenis?: JenisPesan;
};

const gayaPesan: Record<JenisPesan, { kelas: string; ikon: NamaIkon }> = {
  error: { kelas: "border-merah/25 bg-merah-muda text-merah", ikon: "peringatan" },
  sukses: { kelas: "border-hijau/25 bg-hijau-muda text-hijau", ikon: "centang" },
  info: { kelas: "border-biru/20 bg-biru-muda text-biru", ikon: "info" },
  peringatan: { kelas: "border-kuning/25 bg-kuning-muda text-kuning", ikon: "peringatan" },
};

export function Pesan({ children, jenis = "error" }: PesanProps) {
  const { kelas, ikon } = gayaPesan[jenis];
  return (
    <div role={jenis === "error" ? "alert" : "status"} className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${kelas}`}>
      <Ikon nama={ikon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  );
}
