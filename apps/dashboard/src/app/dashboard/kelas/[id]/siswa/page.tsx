import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSiswa, updateSiswa, deleteSiswa } from "@/actions/siswa";
import { Tombol } from "@/components/ui/button";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { FormImporSiswa } from "@/components/form-impor-siswa";

export const metadata: Metadata = { title: "Siswa" };

type ParamPesan = { error?: string; sukses?: string };

// Isian di dalam baris tabel: tanpa bingkai sampai disorot, agar daftar tetap tenang dibaca
const kelasIsianBaris =
  "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-tinta hover:border-garis focus:border-nila focus:bg-permukaan focus:outline-none focus:ring-2 focus:ring-nila-muda";

async function HalamanSiswa({ kelasId, searchParams }: { kelasId: string; searchParams: Promise<ParamPesan> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: kelas } = await supabase.from("kelas").select("nama").eq("id", kelasId).eq("guru_id", user.id).single();
  if (!kelas) redirect("/dashboard/kelas");

  const { data: listSiswa, error: errorList } = await supabase
    .from("siswa")
    .select("id, nama, no_absen")
    .eq("kelas_id", kelasId)
    .order("no_absen", { ascending: true });

  const { error: errorQuery, sukses: pesanSukses } = await searchParams;
  const jumlahSiswa = listSiswa?.length ?? 0;
  const noAbsenBerikutnya = (listSiswa ?? []).reduce((terbesar, siswa) => Math.max(terbesar, siswa.no_absen ?? 0), 0) + 1;

  return (
    <>
      <KepalaHalaman
        judul={`Siswa ${kelas.nama}`}
        deskripsi={jumlahSiswa === 0 ? "Kelas ini belum punya siswa." : `${jumlahSiswa} siswa, diurutkan menurut nomor absen.`}
        kembali={{ href: "/dashboard/kelas", teks: "Semua kelas" }}
      />

      <div className="space-y-4">
        {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
        {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}
      </div>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Kartu judul="Daftar siswa" deskripsi="Klik nama atau nomor untuk mengubah, lalu simpan." tanpaPadding>
          {errorList ? (
            <div className="p-5">
              <Pesan jenis="error">{errorList.message}</Pesan>
            </div>
          ) : jumlahSiswa === 0 ? (
            <KeadaanKosong
              ikon="kelas"
              judul="Belum ada siswa"
              deskripsi="Cara tercepat: salin kolom nomor absen dan nama dari Excel, lalu tempel di panel impor."
            />
          ) : (
            <ul className="divide-y divide-garis">
              {listSiswa?.map((siswa) => (
                <li key={siswa.id} className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
                  <form action={updateSiswa} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={siswa.id} />
                    <input type="hidden" name="kelas_id" value={kelasId} />
                    <input
                      type="number"
                      name="no_absen"
                      defaultValue={siswa.no_absen ?? ""}
                      min="1"
                      required
                      aria-label={`Nomor absen ${siswa.nama}`}
                      className={`${kelasIsianBaris} angka w-16 shrink-0 text-right text-tinta-2`}
                    />
                    <input
                      type="text"
                      name="nama"
                      defaultValue={siswa.nama}
                      required
                      aria-label={`Nama siswa nomor ${siswa.no_absen}`}
                      className={`${kelasIsianBaris} font-medium`}
                    />
                    <Tombol teks="Simpan" jenis="hantu" ukuran="kecil" teksProses="..." />
                  </form>
                  <form action={deleteSiswa}>
                    <input type="hidden" name="id" value={siswa.id} />
                    <input type="hidden" name="kelas_id" value={kelasId} />
                    <TombolKonfirmasi
                      teks="Hapus"
                      jenis="hantu"
                      ukuran="kecil"
                      pesanKonfirmasi={`Hapus ${siswa.nama} dari kelas ini? Data ujiannya ikut terhapus.`}
                      className="hover:text-merah"
                    />
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Kartu>

        <div className="space-y-6 lg:sticky lg:top-8">
          <Kartu judul="Tambah satu siswa">
            <form action={createSiswa} className="flex flex-col gap-3">
              <input type="hidden" name="kelas_id" value={kelasId} />
              <div className="flex gap-2">
                <div className="flex w-20 flex-col gap-1.5">
                  <label htmlFor="no-absen-baru" className="text-sm font-medium text-tinta">
                    No.
                  </label>
                  <input id="no-absen-baru" type="number" name="no_absen" required min="1" defaultValue={noAbsenBerikutnya} className="bidang angka" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="nama-baru" className="text-sm font-medium text-tinta">
                    Nama
                  </label>
                  <input id="nama-baru" type="text" name="nama" required placeholder="Nama lengkap" className="bidang" />
                </div>
              </div>
              <Tombol teks="Tambah siswa" ikon="tambah" teksProses="Menambah..." />
            </form>
          </Kartu>

          <Kartu judul="Impor dari Excel / CSV" deskripsi="Tambah banyak siswa sekaligus.">
            <FormImporSiswa
              kelasId={kelasId}
              listSiswaAda={(listSiswa ?? []).map((siswa) => ({ no_absen: siswa.no_absen, nama: siswa.nama }))}
            />
          </Kartu>
        </div>
      </div>
    </>
  );
}

export default function SiswaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParamPesan> }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat siswa...</p>}>
      <HalamanSiswaDenganParam params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanSiswaDenganParam({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParamPesan> }) {
  const { id } = await params;
  return <HalamanSiswa kelasId={id} searchParams={searchParams} />;
}
