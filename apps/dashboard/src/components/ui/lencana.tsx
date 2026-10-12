import { ReactNode } from "react";

type NadaLencana = "abu" | "biru" | "hijau" | "kuning" | "merah" | "ungu" | "nila";

const warnaLencana: Record<NadaLencana, string> = {
  abu: "bg-kertas text-tinta-2 ring-garis",
  biru: "bg-biru-muda text-biru ring-biru/15",
  hijau: "bg-hijau-muda text-hijau ring-hijau/15",
  kuning: "bg-kuning-muda text-kuning ring-kuning/20",
  merah: "bg-merah-muda text-merah ring-merah/15",
  ungu: "bg-ungu-muda text-ungu ring-ungu/15",
  nila: "bg-nila-muda text-nila ring-nila/15",
};

export function Lencana({ children, nada = "abu", titik = false }: { children: ReactNode; nada?: NadaLencana; titik?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${warnaLencana[nada]}`}
    >
      {titik && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

// Bahasa warna status dipakai sama di semua halaman
const statusUjian: Record<string, { teks: string; nada: NadaLencana }> = {
  draft: { teks: "Draft", nada: "abu" },
  lobby: { teks: "Lobby dibuka", nada: "biru" },
  berjalan: { teks: "Berjalan", nada: "hijau" },
  selesai: { teks: "Selesai", nada: "kuning" },
  dinilai: { teks: "Dinilai", nada: "ungu" },
};

const statusPeserta: Record<string, { teks: string; nada: NadaLencana }> = {
  menunggu: { teks: "Menunggu", nada: "biru" },
  mengerjakan: { teks: "Mengerjakan", nada: "hijau" },
  terkunci: { teks: "Terkunci", nada: "merah" },
  selesai: { teks: "Selesai", nada: "abu" },
};

const tipeSoal: Record<string, { teks: string; nada: NadaLencana }> = {
  pg: { teks: "Pilihan ganda", nada: "nila" },
  benar_salah: { teks: "Benar/Salah", nada: "hijau" },
  essay: { teks: "Essay", nada: "kuning" },
};

export function LencanaStatusUjian({ status }: { status: string }) {
  const gaya = statusUjian[status] ?? { teks: status, nada: "abu" as NadaLencana };
  return (
    <Lencana nada={gaya.nada} titik={status === "lobby" || status === "berjalan"}>
      {gaya.teks}
    </Lencana>
  );
}

export function LencanaStatusPeserta({ status }: { status: string }) {
  const gaya = statusPeserta[status] ?? { teks: status, nada: "abu" as NadaLencana };
  return <Lencana nada={gaya.nada}>{gaya.teks}</Lencana>;
}

export function LencanaTipeSoal({ tipe }: { tipe: string }) {
  const gaya = tipeSoal[tipe] ?? { teks: tipe, nada: "abu" as NadaLencana };
  return <Lencana nada={gaya.nada}>{gaya.teks}</Lencana>;
}
