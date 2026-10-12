import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createKelas, updateKelas, deleteKelas } from "@/actions/kelas";
import { Tombol } from "@/components/ui/button";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";

export const metadata: Metadata = { title: "Kelas & siswa" };

type KelasDenganJumlah = { id: string; nama: string; siswa: { count: number }[] };

async function DaftarKelas({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: dataKelas, error: errorList } = await supabase
    .from("kelas")
    .select("id, nama, siswa(count)")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  const listKelas = (dataKelas ?? []) as KelasDenganJumlah[];
  const { error: errorQuery } = await searchParams;

  return (
    <div className="space-y-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <form action={createKelas} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="nama-kelas-baru" className="text-sm font-medium text-tinta">
              Kelas baru
            </label>
            <input id="nama-kelas-baru" type="text" name="nama" placeholder="Contoh: X IPA 1" required className="bidang" />
          </div>
          <Tombol teks="Tambah kelas" ikon="tambah" teksProses="Menambah..." />
        </form>
      </Kartu>

      <Kartu judul="Daftar kelas" deskripsi={`${listKelas.length} kelas`} tanpaPadding>
        {errorList ? (
          <div className="p-5">
            <Pesan jenis="error">{errorList.message}</Pesan>
          </div>
        ) : listKelas.length === 0 ? (
          <KeadaanKosong
            ikon="kelas"
            judul="Belum ada kelas"
            deskripsi="Tambahkan kelas pertama di atas, lalu masukkan daftar siswanya."
          />
        ) : (
          <ul className="divide-y divide-garis">
            {listKelas.map((kelas) => {
              const jumlahSiswa = kelas.siswa[0]?.count ?? 0;
              return (
                <li key={kelas.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/dashboard/kelas/${kelas.id}/siswa`} className="group min-w-0">
                    <span className="block truncate font-semibold text-tinta group-hover:text-nila">{kelas.nama}</span>
                    <span className="text-sm text-tinta-2">
                      {jumlahSiswa === 0 ? "Belum ada siswa" : `${jumlahSiswa} siswa`}
                    </span>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/kelas/${kelas.id}/siswa`}
                      className="inline-flex h-8 items-center rounded-lg bg-nila-muda px-3 text-xs font-semibold text-nila hover:bg-nila hover:text-white"
                    >
                      {jumlahSiswa === 0 ? "Masukkan siswa" : "Kelola siswa"}
                    </Link>

                    <details className="group relative">
                      <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg px-3 text-xs font-semibold text-tinta-2 hover:bg-kertas">
                        Ganti nama
                      </summary>
                      <form
                        action={updateKelas}
                        className="absolute right-0 z-10 mt-1 flex w-72 gap-2 rounded-lg border border-garis bg-permukaan p-3 shadow-lg"
                      >
                        <input type="hidden" name="id" value={kelas.id} />
                        <input type="text" name="nama" defaultValue={kelas.nama} required aria-label="Nama kelas" className="bidang" />
                        <Tombol teks="Simpan" ukuran="kecil" teksProses="..." />
                      </form>
                    </details>

                    <form action={deleteKelas}>
                      <input type="hidden" name="id" value={kelas.id} />
                      <TombolKonfirmasi
                        teks="Hapus"
                        jenis="hantu"
                        ukuran="kecil"
                        pesanKonfirmasi={`Hapus kelas ${kelas.nama}? ${jumlahSiswa} siswa dan data ujian mereka ikut terhapus permanen.`}
                        className="hover:text-merah"
                      />
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Kartu>
    </div>
  );
}

export default function KelasPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <>
      <KepalaHalaman judul="Kelas & siswa" deskripsi="Siswa memilih kelas dan namanya sendiri saat masuk ujian di HP." />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat kelas...</p>}>
        <DaftarKelas searchParams={searchParams} />
      </Suspense>
    </>
  );
}
