import { Suspense } from "react";
import type { Metadata } from "next";
import { createSoal } from "@/actions/soal";
import { FormSoal } from "@/components/form-soal";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Tulis soal" };

async function PesanError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <div className="mb-4">
      <Pesan jenis="error">{error}</Pesan>
    </div>
  );
}

export default function BuatSoalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="max-w-3xl">
      <KepalaHalaman judul="Tulis soal" kembali={{ href: "/dashboard/soal", teks: "Bank soal" }} />
      <Suspense fallback={null}>
        <PesanError searchParams={searchParams} />
      </Suspense>
      <Kartu>
        <FormSoal aksi={createSoal} teksSimpan="Simpan soal" />
      </Kartu>
    </div>
  );
}
