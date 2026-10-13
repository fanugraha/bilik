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
import { FormImporSiswa } from "@/components/siswa/form-impor-siswa";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { Ikon } from "@/components/ui/ikon";

export const metadata: Metadata = { title: "Siswa" };

type ParamPesan = { error?: string; sukses?: string; cari?: string };

// Isian di dalam baris tabel: tanpa bingkai sampai disorot, agar daftar tetap tenang dibaca.
// Lebar sengaja tidak diatur di sini; tiap isian menentukan lebarnya sendiri agar tidak bertabrakan.
const kelasIsianBaris =
  "rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-tinta hover:border-garis focus:border-nila focus:bg-permukaan focus:outline-none focus:ring-2 focus:ring-nila-muda";

async function HalamanSiswa({ kelasId, searchParams }: { kelasId: string; searchParams: Promise<ParamPesan> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: kelas } = await supabase.from("kelas").select("nama").eq("id", kelasId).eq("guru_id", user.id).single();
  if (!kelas) redirect("/dashboard/kelas");

  const [{ data: listSiswa, error: errorList }, { count: jumlahSoalGuru }] = await Promise.all([
    supabase.from("siswa").select("id, nama, no_absen").eq("kelas_id", kelasId).order("no_absen", { ascending: true }),
    supabase.from("soal").select("id", { count: "exact", head: true }).eq("guru_id", user.id),
  ]);

  const { error: errorQuery, sukses: pesanSukses, cari = "" } = await searchParams;
  const jumlahSiswa = listSiswa?.length ?? 0;
  const noAbsenBerikutnya = (listSiswa ?? []).reduce((terbesar, siswa) => Math.max(terbesar, siswa.no_absen ?? 0), 0) + 1;

  const kataCari = cari.trim().toLowerCase();
  const listSiswaTampil = (listSiswa ?? []).filter((siswa) => {
    if (!kataCari) return true;
    return siswa.nama.toLowerCase().includes(kataCari) || String(siswa.no_absen ?? "").includes(kataCari);
  });

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
        {/* Guru yang baru mulai: setelah siswa masuk, arahkan ke langkah berikutnya */}
        {jumlahSiswa > 0 && (jumlahSoalGuru ?? 0) === 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-nila/20 bg-nila-muda px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-tinta">Siswa sudah masuk</p>
              <p className="text-sm text-tinta-2">Langkah berikutnya: siapkan bank soal dan tulis soalnya.</p>
            </div>
            <TautanTombol href="/dashboard/soal" teks="Ke Bank soal" jenis="utama" />
          </section>
        )}
      </div>

      <div className="mt-4 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Kartu
          judul="Daftar siswa"
          deskripsi="Klik nama atau nomor untuk mengubah, lalu simpan."
          aksi={
            jumlahSiswa > 0 ? (
              <form action={`/dashboard/kelas/${kelasId}/siswa`} className="relative">
                <Ikon nama="cari" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-3" />
                <input
                  type="search"
                  name="cari"
                  defaultValue={cari}
                  placeholder="Cari nama atau nomor"
                  aria-label="Cari siswa"
                  className="bidang w-full pl-9 sm:w-64"
                />
              </form>
            ) : undefined
          }
          tanpaPadding
        >
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
          ) : listSiswaTampil.length === 0 ? (
            <KeadaanKosong
              ikon="cari"
              judul="Tidak ada yang cocok"
              deskripsi={`Tidak ada siswa yang cocok dengan "${cari}".`}
              aksi={<TautanTombol href={`/dashboard/kelas/${kelasId}/siswa`} teks="Hapus pencarian" />}
            />
          ) : (
            <ul className="divide-y divide-garis">
              {listSiswaTampil.map((siswa) => (
                <li key={siswa.id} className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
                  <form action={updateSiswa} className="flex min-w-0 flex-1 items-center gap-2">
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
                      className={`${kelasIsianBaris} min-w-0 flex-1 font-medium`}
                    />
                    <Tombol teks="Simpan" jenis="hantu" ukuran="kecil" teksProses="..." />
                  </form>
                  <form action={deleteSiswa} className="shrink-0">
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

        <div className="space-y-6 xl:sticky xl:top-8">
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
