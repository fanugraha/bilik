import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateUjian } from "@/actions/ujian";
import { IsianUjian } from "@/components/isian-ujian";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function FormUbahUjian({ ujianId, searchParams }: { ujianId: string; searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, mapel, durasi, batas_pelanggaran, acak_soal, acak_opsi, status")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");

  const { data: listKelas } = await supabase
    .from("kelas")
    .select("id, nama")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  const { data: listUjianKelas } = await supabase.from("ujian_kelas").select("kelas_id").eq("ujian_id", ujianId);

  const { error: errorQuery } = await searchParams;

  if (ujian.status !== "draft") {
    return (
      <Pesan jenis="info">
        Ujian yang sudah dibuka lobby tidak bisa diubah lagi.{" "}
        <Link href="/dashboard/ujian" className="underline">
          Kembali ke daftar ujian
        </Link>
      </Pesan>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Ubah Ujian</h2>
        <form action={updateUjian} className="space-y-6">
          <input type="hidden" name="id" value={ujian.id} />
          <IsianUjian
            listKelas={listKelas ?? []}
            teksSimpan="Simpan Perubahan"
            hrefBatal={`/dashboard/ujian/${ujianId}/soal`}
            nilaiAwal={{
              judul: ujian.judul,
              mapel: ujian.mapel,
              durasi: ujian.durasi,
              batas_pelanggaran: ujian.batas_pelanggaran,
              acak_soal: ujian.acak_soal,
              acak_opsi: ujian.acak_opsi,
              listKelasId: (listUjianKelas ?? []).map((baris) => baris.kelas_id),
            }}
          />
        </form>
      </Kartu>
    </div>
  );
}

export default function UbahUjianPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ubah Ujian</h1>
        <Link href="/dashboard/ujian" className="text-sm text-indigo-600 hover:underline">
          ← Kembali
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <HalamanUbah params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HalamanUbah({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  return <FormUbahUjian ujianId={id} searchParams={searchParams} />;
}
