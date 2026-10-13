import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { simpanPesertaUjian } from "@/actions/ujian";
import { IsianPesertaUjian } from "@/components/ujian/isian-ujian";
import { PenandaLangkah, ambilKondisiUjian } from "@/components/ujian/penanda-langkah";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Peserta & aturan ujian" };

type ParamPeserta = Promise<{ error?: string }>;

async function LangkahPeserta({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamPeserta }) {
  await connection();
  const { id: ujianId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, status, batas_pelanggaran, acak_soal, acak_opsi")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "draft") redirect(`/dashboard/ujian/${ujianId}/lobby`);

  const [{ data: listKelas }, { data: listUjianKelas }, kondisi] = await Promise.all([
    supabase.from("kelas").select("id, nama").eq("guru_id", user.id).order("nama", { ascending: true }),
    supabase.from("ujian_kelas").select("kelas_id").eq("ujian_id", ujianId),
    ambilKondisiUjian(supabase, ujianId),
  ]);
  const { error } = await searchParams;

  return (
    <>
      <KepalaHalaman judul={ujian.judul} deskripsi="Draft ujian" kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }} />
      <PenandaLangkah aktif="peserta" kondisi={kondisi} />
      {error && (
        <div className="mb-4">
          <Pesan jenis="error">{error}</Pesan>
        </div>
      )}
      <Kartu judul="Peserta & aturan">
        <form action={simpanPesertaUjian}>
          <input type="hidden" name="id" value={ujian.id} />
          <IsianPesertaUjian
            listKelas={listKelas ?? []}
            nilaiAwal={{
              batas_pelanggaran: ujian.batas_pelanggaran,
              acak_soal: ujian.acak_soal,
              acak_opsi: ujian.acak_opsi,
              listKelasId: (listUjianKelas ?? []).map((baris) => baris.kelas_id),
            }}
          />
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-garis pt-5 sm:flex-row sm:items-center sm:justify-between">
            <TautanTombol href={`/dashboard/ujian/${ujianId}/soal`} teks="Kembali: ambil soal" jenis="hantu" ikon="kembali" />
            <Tombol teks="Simpan & lanjut: tinjau" teksProses="Menyimpan..." disabled={(listKelas ?? []).length === 0} />
          </div>
        </form>
      </Kartu>
    </>
  );
}

export default function PesertaUjianPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamPeserta }) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <LangkahPeserta params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
