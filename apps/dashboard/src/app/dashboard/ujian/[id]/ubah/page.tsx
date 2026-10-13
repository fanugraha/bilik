import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateUjian } from "@/actions/ujian";
import { IsianUjian } from "@/components/ujian/isian-ujian";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Ubah ujian" };

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
      <div className="space-y-4">
        <Pesan jenis="info">Pengaturan tidak bisa diubah lagi karena lobby ujian ini sudah dibuka.</Pesan>
        <TautanTombol href="/dashboard/ujian" teks="Kembali ke daftar ujian" />
      </div>
    );
  }

  return (
    <>
      {errorQuery && (
        <div className="mb-4">
          <Pesan jenis="error">{errorQuery}</Pesan>
        </div>
      )}
      <Kartu>
        <form action={updateUjian}>
          <input type="hidden" name="id" value={ujian.id} />
          <IsianUjian
            listKelas={listKelas ?? []}
            teksSimpan="Simpan perubahan"
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
    </>
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
    <div className="max-w-3xl">
      <KepalaHalaman judul="Ubah pengaturan ujian" kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }} />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <HalamanUbah params={params} searchParams={searchParams} />
      </Suspense>
    </div>
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
