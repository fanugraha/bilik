import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSoal } from "@/actions/soal";
import { FormSoal, type NilaiAwalSoal } from "@/components/form-soal";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Ubah soal" };

async function FormUbahSoal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: soal } = await supabase
    .from("soal")
    .select("tipe, teks, opsi, kunci, pedoman, bobot, jawaban_benar, penjelasan")
    .eq("id", id)
    .eq("guru_id", user.id)
    .single();

  if (!soal) redirect("/dashboard/soal");

  const { error } = await searchParams;
  const nilaiAwal: NilaiAwalSoal = {
    tipe: soal.tipe,
    teks: soal.teks,
    bobot: Number(soal.bobot),
    opsi: (soal.opsi ?? []) as string[],
    kunci: soal.kunci,
    jawaban_benar: soal.jawaban_benar,
    penjelasan: soal.penjelasan,
    pedoman: soal.pedoman,
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <Pesan jenis="error">{error}</Pesan>
        </div>
      )}
      <Kartu>
        <FormSoal aksi={updateSoal} teksSimpan="Simpan perubahan" idSoal={id} nilaiAwal={nilaiAwal} />
      </Kartu>
    </>
  );
}

export default function UbahSoalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="max-w-3xl">
      <KepalaHalaman
        judul="Ubah soal"
        deskripsi="Perubahan berlaku di semua ujian yang memakai soal ini."
        kembali={{ href: "/dashboard/soal", teks: "Bank soal" }}
      />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat soal...</p>}>
        <FormUbahSoal params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
