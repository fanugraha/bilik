import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBank } from "@/actions/bank-soal";
import { ambilDaftarMapel } from "@/lib/mapel";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";
import { PilihMapel } from "@/components/ui/pilih-mapel";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Buat bank soal" };

type ParamBuatBank = Promise<{ error?: string; info?: string }>;

async function PesanAtas({ searchParams }: { searchParams: ParamBuatBank }) {
  const { error, info } = await searchParams;
  if (!error && !info) return null;
  return (
    <div className="mb-4">
      <Pesan jenis={error ? "error" : "info"}>{error ?? info}</Pesan>
    </div>
  );
}

async function FormBankBaru() {
  // Data per guru: render saat request, bukan saat prerender
  await connection();
  const supabase = await createClient();
  const daftarMapel = await ambilDaftarMapel(supabase);
  return (
    <Kartu>
      <form action={createBank} className="flex flex-col gap-5">
        <KotakInput nama="nama" label="Nama bank" wajib placeholder="Contoh: Matematika X - Bab 1 Eksponen" />
        <PilihMapel daftar={daftarMapel} bantuan="Dipakai mengisi otomatis mapel saat membuat ujian dari bank ini." />
        <div className="flex flex-row-reverse justify-start gap-2 border-t border-garis pt-5">
          <Tombol teks="Buat bank" teksProses="Membuat..." />
          <TautanTombol href="/dashboard/soal" teks="Batal" jenis="hantu" />
        </div>
      </form>
    </Kartu>
  );
}

export default function BuatBankPage({ searchParams }: { searchParams: ParamBuatBank }) {
  return (
    <div className="max-w-2xl">
      <KepalaHalaman
        judul="Buat bank soal"
        deskripsi="Bank adalah wadah soal, misalnya satu bank per mapel atau per bab. Setelah dibuat, Anda langsung bisa menulis soal di dalamnya."
        kembali={{ href: "/dashboard/soal", teks: "Bank soal" }}
      />
      <Suspense fallback={null}>
        <PesanAtas searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <FormBankBaru />
      </Suspense>
    </div>
  );
}
