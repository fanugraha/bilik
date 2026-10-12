import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteUjian } from "@/actions/ujian";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function DaftarUjian({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listUjian, error: errorList } = await supabase
    .from("ujian")
    .select("id, judul, mapel, durasi, status, created_at")
    .eq("guru_id", user.id)
    .order("created_at", { ascending: false });

  const { error: errorQuery } = await searchParams;

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return { teks: "Draft", warna: "bg-gray-100 text-gray-800" };
      case "lobby":
        return { teks: "Lobby", warna: "bg-blue-100 text-blue-800" };
      case "berjalan":
        return { teks: "Berjalan", warna: "bg-green-100 text-green-800" };
      case "selesai":
        return { teks: "Selesai", warna: "bg-yellow-100 text-yellow-800" };
      case "dinilai":
        return { teks: "Dinilai", warna: "bg-purple-100 text-purple-800" };
      default:
        return { teks: status, warna: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <>
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <div className="sticky top-0 z-10 bg-white border-b pb-4">
        <Link href="/dashboard/ujian/buat">
          <Tombol teks="+ Buat Ujian Baru" jenis="utama" />
        </Link>
      </div>

      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Daftar Ujian</h2>
        {errorList ? (
          <Pesan jenis="error">{errorList.message}</Pesan>
        ) : listUjian?.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada ujian. Buat yang pertama sekarang!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listUjian?.map((ujian) => {
              const { teks, warna } = statusLabel(ujian.status);
              return (
                <div
                  key={ujian.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${warna}`}>
                      {teks}
                    </span>
                    <span className="text-xs text-gray-500">{ujian.durasi} menit</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-gray-900 line-clamp-1">{ujian.judul}</h3>
                  {ujian.mapel && <p className="text-xs text-gray-600 mt-1">{ujian.mapel}</p>}
                  <div className="mt-3 flex gap-2">
                    {ujian.status === "draft" ? (
                      <Link href={`/dashboard/ujian/${ujian.id}/soal`} className="flex-1">
                        <Tombol teks="Atur Soal" jenis="utama" />
                      </Link>
                    ) : ujian.status === "lobby" || ujian.status === "berjalan" ? (
                      <Link href={`/dashboard/ujian/${ujian.id}/lobby`} className="flex-1">
                        <Tombol teks="Ruang Kontrol" jenis="utama" />
                      </Link>
                    ) : (
                      <Link href={`/dashboard/ujian/${ujian.id}/nilai`} className="flex-1">
                        <Tombol teks="Lihat Nilai" jenis="kedua" />
                      </Link>
                    )}
                    {ujian.status === "draft" && (
                      <form className="flex-1">
                        <input type="hidden" name="id" value={ujian.id} />
                        <Tombol teks="Hapus" jenis="bahaya" formAction={deleteUjian} />
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Kartu>
    </>
  );
}

export default function UjianPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Ujian</h1>
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
          ← Kembali ke Dashboard
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <DaftarUjian searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
