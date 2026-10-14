import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { simpanInfoUjian } from "@/actions/ujian";
import { ambilDaftarMapel } from "@/lib/mapel";
import { IsianInfoUjian } from "@/components/ujian/isian-ujian";
import { PenandaLangkah, ambilKondisiUjian } from "@/components/ujian/penanda-langkah";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Info ujian" };

type ParamUbah = Promise<{ error?: string }>;

async function LangkahInfo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamUbah }) {
  await connection();
  const { id: ujianId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, mapel_id, durasi, status, kkm")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "draft") redirect(`/dashboard/ujian/${ujianId}/lobby`);

  const [daftarMapel, kondisi] = await Promise.all([ambilDaftarMapel(supabase), ambilKondisiUjian(supabase, ujianId)]);
  const { error } = await searchParams;

  return (
    <>
      <KepalaHalaman judul={ujian.judul} deskripsi="Draft ujian" kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }} />
      <PenandaLangkah aktif="info" kondisi={kondisi} />
      {error && (
        <div className="mb-4">
          <Pesan jenis="error">{error}</Pesan>
        </div>
      )}
      <Kartu judul="Info ujian">
        <form action={simpanInfoUjian}>
          <input type="hidden" name="id" value={ujian.id} />
          <IsianInfoUjian daftarMapel={daftarMapel} nilaiAwal={{ judul: ujian.judul, mapel_id: ujian.mapel_id, durasi: ujian.durasi, kkm: ujian.kkm }} />
          <div className="mt-6 flex flex-row-reverse justify-start gap-2 border-t border-garis pt-5">
            <Tombol teks="Simpan & lanjut: ambil soal" teksProses="Menyimpan..." />
            <TautanTombol href={`/dashboard/ujian/${ujianId}/soal`} teks="Lewati" jenis="hantu" />
          </div>
        </form>
      </Kartu>
    </>
  );
}

export default function UbahUjianPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamUbah }) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <LangkahInfo params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
