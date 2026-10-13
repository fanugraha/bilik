import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSoal } from "@/actions/soal";
import { updateBank, deleteBank, pindahkanSoal } from "@/actions/bank-soal";
import { ambilDaftarMapel } from "@/lib/mapel";
import { Tombol } from "@/components/ui/button";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { PilihMapel } from "@/components/ui/pilih-mapel";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { Ikon } from "@/components/ui/ikon";

export const metadata: Metadata = { title: "Bank soal" };

const ID_FORM_PINDAH = "form-pindah-soal";

type ParamBank = Promise<{ error?: string; sukses?: string; tipe?: string; cari?: string }>;

const daftarFilter = [
  { nilai: "", teks: "Semua" },
  { nilai: "pg", teks: "Pilihan ganda" },
  { nilai: "benar_salah", teks: "Benar/Salah" },
  { nilai: "essay", teks: "Essay" },
];

function hrefFilter(bankId: string, { tipe, cari }: { tipe?: string; cari?: string }) {
  const param = new URLSearchParams();
  if (tipe) param.set("tipe", tipe);
  if (cari) param.set("cari", cari);
  const teksParam = param.toString();
  return `/dashboard/soal/bank/${bankId}${teksParam ? `?${teksParam}` : ""}`;
}

async function IsiBank({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamBank }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: bank }, { data: semuaSoal, error: errorList }, { data: bankLain }, daftarMapel] = await Promise.all([
    supabase.from("bank_soal").select("id, nama, mapel, mapel_id").eq("id", id).eq("guru_id", user.id).maybeSingle(),
    supabase
      .from("soal")
      .select("id, tipe, teks, bobot")
      .eq("bank_soal_id", id)
      .eq("guru_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("bank_soal").select("id, nama").eq("guru_id", user.id).neq("id", id).order("nama", { ascending: true }),
    ambilDaftarMapel(supabase),
  ]);

  if (!bank) redirect("/dashboard/soal?error=" + encodeURIComponent("Bank soal tidak ditemukan"));

  const { error, sukses, tipe = "", cari = "" } = await searchParams;
  const listSemua = semuaSoal ?? [];
  const kataCari = cari.trim().toLowerCase();
  const listSoal = listSemua.filter((soal) => {
    if (tipe && soal.tipe !== tipe) return false;
    if (kataCari && !soal.teks.toLowerCase().includes(kataCari)) return false;
    return true;
  });

  const jumlahPerTipe = new Map<string, number>([["", listSemua.length]]);
  for (const soal of listSemua) jumlahPerTipe.set(soal.tipe, (jumlahPerTipe.get(soal.tipe) ?? 0) + 1);

  const hrefTulis = `/dashboard/soal/buat?bank=${bank.id}`;

  return (
    <>
      <KepalaHalaman
        judul={bank.nama}
        deskripsi={`${bank.mapel ? `${bank.mapel}, ` : ""}${listSemua.length} soal`}
        kembali={{ href: "/dashboard/soal", teks: "Bank soal" }}
        aksi={<TautanTombol href={hrefTulis} teks="Tulis soal" jenis="utama" ikon="tambah" />}
      />

      <div className="space-y-4">
        {error && <Pesan jenis="error">{error}</Pesan>}
        {sukses && <Pesan jenis="sukses">{sukses}</Pesan>}

        {listSemua.length > 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-nila/20 bg-nila-muda px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-tinta">Bank ini siap dipakai</p>
              <p className="text-sm text-tinta-2">Langkah berikutnya: susun ujian dan ambil soal dari bank ini.</p>
            </div>
            <TautanTombol href={`/dashboard/ujian/buat?bank=${bank.id}`} teks="Buat ujian dari bank ini" ikon="ujian" />
          </section>
        )}

        <Kartu tanpaPadding>
          {errorList ? (
            <div className="p-5">
              <Pesan jenis="error">{errorList.message}</Pesan>
            </div>
          ) : listSemua.length === 0 ? (
            <KeadaanKosong
              ikon="soal"
              judul="Bank ini masih kosong"
              deskripsi="Tulis soal pertama. Setelah menyimpan, Anda bisa langsung menulis soal berikutnya."
              aksi={<TautanTombol href={hrefTulis} teks="Tulis soal pertama" jenis="utama" ikon="tambah" />}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-garis px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <nav aria-label="Saring tipe soal" className="flex gap-1 overflow-x-auto">
                  {daftarFilter.map((filter) => {
                    const aktif = tipe === filter.nilai;
                    return (
                      <Link
                        key={filter.nilai}
                        href={hrefFilter(bank.id, { tipe: filter.nilai, cari })}
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
                <form action={`/dashboard/soal/bank/${bank.id}`} className="relative lg:w-72">
                  {tipe && <input type="hidden" name="tipe" value={tipe} />}
                  <Ikon nama="cari" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-3" />
                  <input type="search" name="cari" defaultValue={cari} placeholder="Cari teks soal" aria-label="Cari soal" className="bidang pl-9" />
                </form>
              </div>

              {listSoal.length === 0 ? (
                <KeadaanKosong
                  ikon="cari"
                  judul="Tidak ada soal yang cocok"
                  deskripsi="Coba kata lain atau tampilkan semua tipe soal."
                  aksi={<TautanTombol href={hrefFilter(bank.id, {})} teks="Hapus saringan" />}
                />
              ) : (
                // Centang soal terhubung ke form pindah lewat atribut form="...", sehingga tiap baris
                // tetap bisa punya form Hapus sendiri tanpa form bersarang
                <>
                  <ul className="divide-y divide-garis">
                    {listSoal.map((soal) => (
                      <li key={soal.id} className="flex gap-3 px-5 py-4">
                        {(bankLain ?? []).length > 0 && (
                          <input
                            type="checkbox"
                            name="soal_id"
                            value={soal.id}
                            form={ID_FORM_PINDAH}
                            aria-label="Pilih soal untuk dipindahkan"
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-nila)]"
                          />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <Link href={`/dashboard/soal/${soal.id}/ubah`} className="group min-w-0 flex-1">
                            <span className="mb-1.5 flex flex-wrap items-center gap-2">
                              <LencanaTipeSoal tipe={soal.tipe} />
                              <span className="text-xs text-tinta-2">Bobot {soal.bobot}</span>
                            </span>
                            <span className="line-clamp-2 text-sm text-tinta group-hover:text-nila">{soal.teks}</span>
                          </Link>
                          <div className="flex shrink-0 gap-1">
                            <TautanTombol href={`/dashboard/soal/${soal.id}/ubah`} teks="Ubah" jenis="hantu" ukuran="kecil" />
                            <form action={deleteSoal}>
                              <input type="hidden" name="id" value={soal.id} />
                              <input type="hidden" name="bank_soal_id" value={bank.id} />
                              <TombolKonfirmasi
                                teks="Hapus"
                                jenis="hantu"
                                ukuran="kecil"
                                pesanKonfirmasi="Hapus soal ini? Soal juga hilang dari ujian yang memakainya."
                                className="hover:text-merah"
                              />
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {(bankLain ?? []).length > 0 && (
                    <form
                      id={ID_FORM_PINDAH}
                      action={pindahkanSoal}
                      className="flex flex-col gap-2 border-t border-garis bg-kertas/40 px-5 py-3 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="bank_asal" value={bank.id} />
                      <label htmlFor="bank_tujuan" className="text-sm text-tinta-2">
                        Pindahkan soal yang dicentang ke
                      </label>
                      <select id="bank_tujuan" name="bank_tujuan" defaultValue="" required className="bidang sm:w-64">
                        <option value="" disabled>
                          Pilih bank tujuan
                        </option>
                        {(bankLain ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nama}
                          </option>
                        ))}
                      </select>
                      <Tombol teks="Pindahkan" jenis="kedua" ukuran="kecil" teksProses="Memindahkan..." />
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </Kartu>

        <details className="rounded-xl border border-garis bg-permukaan">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-tinta-2 hover:text-tinta">
            Pengaturan bank
          </summary>
          <div className="space-y-5 border-t border-garis px-5 py-4">
            <form action={updateBank} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="id" value={bank.id} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nama-bank" className="text-sm font-medium text-tinta">
                  Nama bank
                </label>
                <input id="nama-bank" name="nama" defaultValue={bank.nama} required className="bidang" />
              </div>
              <PilihMapel daftar={daftarMapel} terpilih={bank.mapel_id} label="Mata pelajaran (opsional)" />
              <Tombol teks="Simpan" jenis="kedua" teksProses="Menyimpan..." />
            </form>
            <form action={deleteBank} className="flex flex-col gap-2 border-t border-garis pt-4 sm:flex-row sm:items-center sm:justify-between">
              <input type="hidden" name="id" value={bank.id} />
              <p className="text-sm text-tinta-2">
                {listSemua.length > 0
                  ? "Bank hanya bisa dihapus jika sudah kosong. Pindahkan atau hapus soalnya dulu."
                  : "Bank ini kosong dan aman dihapus."}
              </p>
              <TombolKonfirmasi
                teks="Hapus bank"
                jenis="hantu"
                ukuran="kecil"
                pesanKonfirmasi={`Hapus bank ${bank.nama}?`}
                className="hover:text-merah"
              />
            </form>
          </div>
        </details>
      </div>
    </>
  );
}

export default function DetailBankPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamBank }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat bank soal...</p>}>
      <IsiBank params={params} searchParams={searchParams} />
    </Suspense>
  );
}
