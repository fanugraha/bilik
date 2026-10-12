import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSiswa, updateSiswa, deleteSiswa } from "@/actions/siswa";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function DaftarSiswa({
  kelasId,
  searchParams,
}: {
  kelasId: string;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: kelas } = await supabase
    .from("kelas")
    .select("nama")
    .eq("id", kelasId)
    .eq("guru_id", user.id)
    .single();

  if (!kelas) redirect("/dashboard/kelas");

  const { data: listSiswa, error: errorList } = await supabase
    .from("siswa")
    .select("id, nama, no_absen, created_at")
    .eq("kelas_id", kelasId)
    .order("no_absen", { ascending: true });

  const { error: errorQuery } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Tambah Siswa Baru
        </h2>
        <form action={createSiswa} className="flex gap-3">
          <input type="hidden" name="kelas_id" value={kelasId} />
          <input
            type="text"
            name="nama"
            placeholder="Nama siswa"
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            name="no_absen"
            placeholder="No"
            required
            min="1"
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Tombol teks="Tambah" jenis="utama" />
        </form>
      </Kartu>

      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Daftar Siswa - {kelas.nama}
        </h2>
        {errorList ? (
          <Pesan jenis="error">{errorList.message}</Pesan>
        ) : listSiswa?.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada siswa. Tambahkan yang pertama di atas!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {listSiswa?.map((siswa) => (
              <div
                key={siswa.id}
                className="flex items-center justify-between py-3"
              >
                <form className="flex flex-1 items-center gap-2 pr-4">
                  <input type="hidden" name="id" value={siswa.id} />
                  <input type="hidden" name="kelas_id" value={kelasId} />
                  <input
                    type="number"
                    name="no_absen"
                    defaultValue={siswa.no_absen || ""}
                    min="1"
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    name="nama"
                    defaultValue={siswa.nama}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <Tombol teks="Simpan" jenis="kedua" formAction={updateSiswa} />
                </form>
                <form>
                  <input type="hidden" name="id" value={siswa.id} />
                  <input type="hidden" name="kelas_id" value={kelasId} />
                  <Tombol
                    teks="Hapus"
                    jenis="bahaya"
                    formAction={deleteSiswa}
                  />
                </form>
              </div>
            ))}
          </div>
        )}
      </Kartu>
    </div>
  );
}

async function HalamanSiswa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { id } = await params;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Siswa</h1>
        <a
          href="/dashboard/kelas"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Kembali ke Kelas
        </a>
      </div>
      <DaftarSiswa kelasId={id} searchParams={searchParams} />
    </>
  );
}

export default function SiswaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <HalamanSiswa params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
