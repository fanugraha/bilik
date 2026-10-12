import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createKelas, updateKelas, deleteKelas } from "@/actions/kelas";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function DaftarKelas({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listKelas, error: errorList } = await supabase
    .from("kelas")
    .select("id, nama, created_at")
    .eq("guru_id", user.id)
    .order("created_at", { ascending: false });

  const { error: errorQuery } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Buat Kelas Baru
        </h2>
        <form action={createKelas} className="flex gap-3">
          <input
            type="text"
            name="nama"
            placeholder="Nama kelas (contoh: 10A)"
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Tombol teks="Buat Kelas" jenis="utama" />
        </form>
      </Kartu>

      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Daftar Kelas</h2>
        {errorList ? (
          <Pesan jenis="error">{errorList.message}</Pesan>
        ) : listKelas?.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada kelas. Buat yang pertama di atas!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {listKelas?.map((kelas) => (
              <div
                key={kelas.id}
                className="flex items-center justify-between py-3"
              >
                <form className="flex flex-1 items-center gap-2 pr-4">
                  <input type="hidden" name="id" value={kelas.id} />
                  <input
                    type="text"
                    name="nama"
                    defaultValue={kelas.nama}
                    className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <Tombol teks="Simpan" jenis="kedua" formAction={updateKelas} />
                </form>
                <form>
                  <input type="hidden" name="id" value={kelas.id} />
                  <Tombol
                    teks="Hapus"
                    jenis="bahaya"
                    formAction={deleteKelas}
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

export default function KelasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Kelas</h1>
        <a
          href="/dashboard"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Kembali ke Dashboard
        </a>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <DaftarKelas searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
