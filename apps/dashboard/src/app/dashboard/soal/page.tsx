import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSoal } from "@/actions/soal";
import { createBank, updateBank, deleteBank } from "@/actions/bank-soal";
import { Tombol } from "@/components/ui/button";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { Ikon } from "@/components/ui/ikon";

export const metadata: Metadata = { title: "Bank soal" };

type ParamSoal = { error?: string; tipe?: string; cari?: string; bank?: string };

const daftarFilter = [
  { nilai: "", teks: "Semua" },
  { nilai: "pg", teks: "Pilihan ganda" },
  { nilai: "benar_salah", teks: "Benar/Salah" },
  { nilai: "essay", teks: "Essay" },
];

function hrefFilter({ tipe, cari, bank }: { tipe?: string; cari?: string; bank?: string }) {
  const param = new URLSearchParams();
  if (tipe) param.set("tipe", tipe);
  if (cari) param.set("cari", cari);
  if (bank) param.set("bank", bank);
  const teksParam = param.toString();
  return teksParam ? `/dashboard/soal?${teksParam}` : "/dashboard/soal";
}

async function DaftarSoal({ searchParams }: { searchParams: Promise<ParamSoal> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { tipe = "", cari = "", bank = "", error: errorQuery } = await searchParams;

  const [{ data: semuaSoal, error: errorList }, { data: daftarBank }] = await Promise.all([
    supabase
      .from("soal")
      .select("id, tipe, teks, bobot, bank_soal_id")
      .eq("guru_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("bank_soal").select("id, nama").eq("guru_id", user.id).order("nama", { ascending: true }),
  ]);

  const bankList = daftarBank ?? [];
  const namaBank = new Map(bankList.map((b) => [b.id, b.nama]));

  const kataCari = cari.trim().toLowerCase();
  const listSoal = (semuaSoal ?? []).filter((soal) => {
    if (tipe && soal.tipe !== tipe) return false;
    if (bank && soal.bank_soal_id !== bank) return false;
    if (kataCari && !soal.teks.toLowerCase().includes(kataCari)) return false;
    return true;
  });

  const jumlahPerTipe = new Map<string, number>([["", semuaSoal?.length ?? 0]]);
  for (const soal of semuaSoal ?? []) jumlahPerTipe.set(soal.tipe, (jumlahPerTipe.get(soal.tipe) ?? 0) + 1);

  const jumlahPerBank = new Map<string, number>();
  for (const soal of semuaSoal ?? []) {
    if (soal.bank_soal_id) jumlahPerBank.set(soal.bank_soal_id, (jumlahPerBank.get(soal.bank_soal_id) ?? 0) + 1);
  }

  const bankKosong = (semuaSoal?.length ?? 0) === 0;

  return (
    <div className="space-y-4">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu tanpaPadding>
        {!bankKosong && (
          <>
            <div className="flex flex-col gap-3 border-b border-garis px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <nav aria-label="Saring tipe soal" className="flex gap-1 overflow-x-auto">
                {daftarFilter.map((filter) => {
                  const aktif = tipe === filter.nilai;
                  return (
                    <Link
                      key={filter.nilai}
                      href={hrefFilter({ tipe: filter.nilai, cari, bank })}
                      aria-current={aktif ? "page" : undefined}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${
                        aktif ? "bg-nila-muda text-nila" : "text-tinta-2 hover:bg-kertas hover:text-tinta"
                      }`}
                    >
                      {filter.teks}
                      <span className="angka text-xs font-medium opacity-70">{jumlahPerTipe.get(filter.nilai) ?? 0}</span>
                    </Link>
                  );
                })}
              </nav>
              <form action="/dashboard/soal" className="relative lg:w-72">
                {tipe && <input type="hidden" name="tipe" value={tipe} />}
                {bank && <input type="hidden" name="bank" value={bank} />}
                <Ikon nama="cari" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-3" />
                <input type="search" name="cari" defaultValue={cari} placeholder="Cari teks soal" aria-label="Cari soal" className="bidang pl-9" />
              </form>
            </div>

            <div className="flex flex-col gap-3 border-b border-garis bg-kertas/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <nav aria-label="Saring bank soal" className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-semibold text-tinta-3">Bank:</span>
                <Link
                  href={hrefFilter({ tipe, cari })}
                  aria-current={bank === "" ? "page" : undefined}
                  className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${
                    bank === "" ? "bg-papan text-white" : "bg-permukaan text-tinta-2 ring-1 ring-garis ring-inset hover:text-tinta"
                  }`}
                >
                  Semua
                </Link>
                {bankList.map((b) => {
                  const aktif = bank === b.id;
                  return (
                    <Link
                      key={b.id}
                      href={hrefFilter({ tipe, cari, bank: b.id })}
                      aria-current={aktif ? "page" : undefined}
                      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                        aktif ? "bg-papan text-white" : "bg-permukaan text-tinta-2 ring-1 ring-garis ring-inset hover:text-tinta"
                      }`}
                    >
                      {b.nama}
                      <span className="angka opacity-70">{jumlahPerBank.get(b.id) ?? 0}</span>
                    </Link>
                  );
                })}
              </nav>

              <details className="relative">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-tinta-2 hover:bg-kertas">
                  <Ikon nama="tambah" className="h-3.5 w-3.5" />
                  Kelola bank
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-80 rounded-lg border border-garis bg-permukaan p-3 shadow-lg">
                  <form action={createBank} className="flex gap-2">
                    <input type="text" name="nama" placeholder="Nama bank baru" required aria-label="Nama bank baru" className="bidang" />
                    <Tombol teks="Tambah" ukuran="kecil" teksProses="..." />
                  </form>
                  {bankList.length === 0 ? (
                    <p className="mt-2 text-xs text-tinta-2">Belum ada bank. Bank dipakai untuk mengelompokkan soal.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-garis">
                      {bankList.map((b) => (
                        <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="min-w-0 truncate text-sm text-tinta">{b.nama}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            <details className="relative">
                              <summary className="cursor-pointer list-none rounded px-2 py-0.5 text-xs font-semibold text-tinta-2 hover:bg-kertas">
                                Ganti nama
                              </summary>
                              <form
                                action={updateBank}
                                className="absolute right-0 z-10 mt-1 flex w-60 gap-2 rounded-lg border border-garis bg-permukaan p-3 shadow-lg"
                              >
                                <input type="hidden" name="id" value={b.id} />
                                <input type="text" name="nama" defaultValue={b.nama} required aria-label="Nama bank" className="bidang" />
                                <Tombol teks="Simpan" ukuran="kecil" teksProses="..." />
                              </form>
                            </details>
                            <form action={deleteBank}>
                              <input type="hidden" name="id" value={b.id} />
                              <TombolKonfirmasi
                                teks="Hapus"
                                jenis="hantu"
                                ukuran="kecil"
                                pesanKonfirmasi={`Hapus bank ${b.nama}? Soalnya tidak terhapus, hanya keluar dari bank ini.`}
                                className="hover:text-merah"
                              />
                            </form>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </div>
          </>
        )}

        {errorList ? (
          <div className="p-5">
            <Pesan jenis="error">{errorList.message}</Pesan>
          </div>
        ) : bankKosong ? (
          <KeadaanKosong
            ikon="soal"
            judul="Bank soal masih kosong"
            deskripsi="Soal yang ditulis di sini bisa dipakai berulang di banyak ujian."
            aksi={<TautanTombol href="/dashboard/soal/buat" teks="Tulis soal pertama" jenis="utama" ikon="tambah" />}
          />
        ) : listSoal.length === 0 ? (
          <KeadaanKosong
            ikon="cari"
            judul="Tidak ada soal yang cocok"
            deskripsi="Coba kata lain, ubah bank, atau tampilkan semua tipe soal."
            aksi={<TautanTombol href="/dashboard/soal" teks="Hapus saringan" />}
          />
        ) : (
          <ul className="divide-y divide-garis">
            {listSoal.map((soal) => (
              <li key={soal.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <Link href={`/dashboard/soal/${soal.id}/ubah`} className="group min-w-0 flex-1">
                  <span className="mb-1.5 flex flex-wrap items-center gap-2">
                    <LencanaTipeSoal tipe={soal.tipe} />
                    {soal.bank_soal_id && <span className="text-xs font-semibold text-nila">{namaBank.get(soal.bank_soal_id)}</span>}
                    <span className="text-xs text-tinta-2">Bobot {soal.bobot}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-tinta group-hover:text-nila">{soal.teks}</span>
                </Link>
                <div className="flex shrink-0 gap-1">
                  <TautanTombol href={`/dashboard/soal/${soal.id}/ubah`} teks="Ubah" jenis="hantu" ukuran="kecil" />
                  <form action={deleteSoal}>
                    <input type="hidden" name="id" value={soal.id} />
                    <TombolKonfirmasi
                      teks="Hapus"
                      jenis="hantu"
                      ukuran="kecil"
                      pesanKonfirmasi="Hapus soal ini dari bank soal? Soal juga hilang dari ujian yang memakainya."
                      className="hover:text-merah"
                    />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  );
}

export default function SoalPage({ searchParams }: { searchParams: Promise<ParamSoal> }) {
  return (
    <>
      <KepalaHalaman
        judul="Bank soal"
        deskripsi="Kelompokkan soal ke bank, lalu pakai banknya saat menyusun ujian. Kunci jawaban dan pedoman hanya terlihat oleh Anda."
        aksi={<TautanTombol href="/dashboard/soal/buat" teks="Tulis soal" jenis="utama" ikon="tambah" />}
      />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat soal...</p>}>
        <DaftarSoal searchParams={searchParams} />
      </Suspense>
    </>
  );
}
