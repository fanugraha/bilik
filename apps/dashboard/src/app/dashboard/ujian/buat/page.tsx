import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createUjian } from "@/actions/ujian";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function FormUjianBaru({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listKelas } = await supabase
    .from("kelas")
    .select("id, nama")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  const { error: errorQuery } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Buat Ujian Baru</h2>
        <form action={createUjian} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul Ujian</label>
              <input
                type="text"
                name="judul"
                placeholder="Contoh: UTS Matematika Kelas X"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mapel (Opsional)</label>
              <input
                type="text"
                name="mapel"
                placeholder="Contoh: Matematika"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
              <input
                type="number"
                name="durasi"
                placeholder="Contoh: 60"
                required
                min="1"
                defaultValue="60"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batas Pelanggaran</label>
              <input
                type="number"
                name="batas_pelanggaran"
                placeholder="Contoh: 3"
                min="1"
                defaultValue="3"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="acak_soal" value="true" className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Acak urutan soal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="acak_opsi" value="true" className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Acak opsi jawaban (untuk soal PG)</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kelas Peserta</label>
            {listKelas && listKelas.length > 0 ? (
              <div className="space-y-2">
                {listKelas.map((kelas) => (
                  <label key={kelas.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="kelas_ids[]" value={kelas.id} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">{kelas.nama}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Belum ada kelas. Buat kelas terlebih dahulu.</p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Link href="/dashboard/ujian" className="flex-1">
              <Tombol teks="Batal" jenis="kedua" className="w-full" />
            </Link>
            <button type="submit" className="flex-1">
              <Tombol teks="Buat Ujian" jenis="utama" className="w-full" />
            </button>
          </div>
        </form>
      </Kartu>
    </div>
  );
}

export default function BuatUjianPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Buat Ujian</h1>
        <Link href="/dashboard/ujian" className="text-sm text-indigo-600 hover:underline">
          ← Kembali
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <FormUjianBaru searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
