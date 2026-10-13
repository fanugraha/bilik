import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createUjian } from "@/actions/ujian";
import { IsianUjian } from "@/components/ujian/isian-ujian";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Buat ujian" };

async function FormUjianBaru({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listKelas } = await supabase.from("kelas").select("id, nama").eq("guru_id", user.id).order("nama", { ascending: true });
  const { error: errorQuery } = await searchParams;

  return (
    <>
      {errorQuery && (
        <div className="mb-4">
          <Pesan jenis="error">{errorQuery}</Pesan>
        </div>
      )}
      <Kartu>
        <form action={createUjian}>
          <IsianUjian listKelas={listKelas ?? []} teksSimpan="Lanjut pilih soal" hrefBatal="/dashboard/ujian" />
        </form>
      </Kartu>
    </>
  );
}

export default function BuatUjianPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="max-w-3xl">
      <KepalaHalaman
        judul="Buat ujian"
        deskripsi="Langkah berikutnya: memilih soal dari bank soal."
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
      />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <FormUjianBaru searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
