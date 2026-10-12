import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSoal } from "@/actions/soal";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function DaftarSoal({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tipe?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { tipe, error: errorQuery } = await searchParams;

  const { data: semuaSoal, error: errorList } = await supabase
    .from("soal")
    .select("id, tipe, teks, bobot, created_at")
    .eq("guru_id", user.id)
    .order("created_at", { ascending: false });

  const listSoal = (semuaSoal ?? []).filter(
    (s) => tipe !== "pg" && tipe !== "essay" && tipe !== "benar_salah" ? true : s.tipe === tipe,
  );
  const jumlahPg = (semuaSoal ?? []).filter((s) => s.tipe === "pg").length;
  const jumlahEssay = (semuaSoal ?? []).filter((s) => s.tipe === "essay").length;
  const jumlahBenarSalah = (semuaSoal ?? []).filter((s) => s.tipe === "benar_salah").length;

  return (
    <>
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <div className="sticky top-0 z-10 bg-white border-b pb-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <a href="/dashboard/soal" className="flex-shrink-0">
            <Tombol teks={`Semua ${semuaSoal?.length ?? 0}`} jenis="kedua" />
          </a>
          <a href="/dashboard/soal?tipe=pg" className="flex-shrink-0">
            <Tombol teks={`PG ${jumlahPg}`} jenis="kedua" />
          </a>
          <a href="/dashboard/soal?tipe=essay" className="flex-shrink-0">
            <Tombol teks={`Essay ${jumlahEssay}`} jenis="kedua" />
          </a>
          <a href="/dashboard/soal?tipe=benar_salah" className="flex-shrink-0">
            <Tombol teks={`B/S ${jumlahBenarSalah}`} jenis="kedua" />
          </a>
          <a href="/dashboard/soal/buat" className="ml-auto flex-shrink-0">
            <Tombol teks="+ Soal Baru" jenis="utama" />
          </a>
        </div>
      </div>

      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Daftar Bank Soal</h2>
        {errorList ? (
          <Pesan jenis="error">{errorList.message}</Pesan>
        ) : listSoal?.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada soal. Buat yang pertama sekarang!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listSoal?.map((soal) => (
              <div
                key={soal.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      soal.tipe === "pg"
                        ? "bg-indigo-100 text-indigo-800"
                        : soal.tipe === "benar_salah"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {soal.tipe === "pg" ? "PG" : soal.tipe === "benar_salah" ? "B/S" : "Essay"}
                  </span>
                  <span className="text-xs text-gray-500">{soal.bobot}</span>
                </div>
                <p className="mt-2 text-sm text-gray-900 line-clamp-2">{soal.teks}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`/dashboard/soal/${soal.id}/ubah`}
                    className="flex-1"
                  >
                    <Tombol teks="Ubah" jenis="kedua" />
                  </a>
                  <form className="flex-1">
                    <input type="hidden" name="id" value={soal.id} />
                    <Tombol teks="Hapus" jenis="bahaya" formAction={deleteSoal} />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Kartu>
    </>
  );
}

export default function SoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tipe?: string }>;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bank Soal</h1>
        <a
          href="/dashboard"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Kembali ke Dashboard
        </a>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <DaftarSoal searchParams={searchParams} />
      </Suspense>
      <a
        href="/dashboard/soal/buat"
        className="fixed bottom-6 right-6 z-20 md:inline-block hidden"
      >
        <Tombol teks="+ Buat" jenis="utama" className="rounded-full" />
      </a>
    </main>
  );
}