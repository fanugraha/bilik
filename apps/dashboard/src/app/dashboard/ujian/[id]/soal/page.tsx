import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilSoalPerTipe, tambahSoalUjian, hapusSoalUjian, kosongkanBagian, geserSection } from "@/actions/ujian";
import { NAMA_TIPE, URUTAN_TIPE, adalahTipeSoal, hitungPerTipe } from "@/lib/bagian-ujian";
import { namaMapel } from "@/lib/mapel";
import { PenandaLangkah } from "@/components/ujian/penanda-langkah";
import { Tombol } from "@/components/ui/button";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Ambil soal ujian" };

type ParamSoal = Promise<{ bank?: string; error?: string; sukses?: string }>;
type SoalUjianBaris = { soal_id: string; section_id: string | null; urutan: number; bobot: number; soal: { tipe: string; teks: string } | null };

function namaBagian(tipe: string) {
  return adalahTipeSoal(tipe) ? NAMA_TIPE[tipe] : tipe;
}

async function AmbilSoal({ ujianId, searchParams }: { ujianId: string; searchParams: ParamSoal }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: ujian }, { data: dataSection }, { data: ujianSoal }, { data: daftarBank }] = await Promise.all([
    supabase
      .from("ujian")
      .select("id, judul, durasi, status, mapel_ref:mapel_id(nama), ujian_kelas(kelas_id)")
      .eq("id", ujianId)
      .eq("guru_id", user.id)
      .single(),
    supabase.from("ujian_section").select("id, urutan, tipe").eq("ujian_id", ujianId).order("urutan", { ascending: true }),
    supabase
      .from("ujian_soal")
      .select("soal_id, section_id, urutan, bobot, soal:soal_id(tipe, teks)")
      .eq("ujian_id", ujianId)
      .order("urutan", { ascending: true }),
    supabase.from("bank_soal").select("id, nama").eq("guru_id", user.id).order("nama", { ascending: true }),
  ]);

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "draft") redirect(`/dashboard/ujian/${ujianId}/lobby`);

  const { bank: bankDiminta = "", error: errorQuery, sukses: pesanSukses } = await searchParams;
  const listBank = daftarBank ?? [];
  // Selalu ada satu bank terpilih agar panel kanan langsung bisa dipakai
  const bankAktif = listBank.find((b) => b.id === bankDiminta) ?? listBank[0] ?? null;
  const bank = bankAktif?.id ?? "";

  const { data: soalBank } = bankAktif
    ? await supabase
        .from("soal")
        .select("id, tipe, teks")
        .eq("bank_soal_id", bankAktif.id)
        .eq("guru_id", user.id)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; tipe: string; teks: string }[] };

  const baris: SoalUjianBaris[] = (ujianSoal ?? []).map((r) => ({
    soal_id: r.soal_id,
    section_id: r.section_id,
    urutan: r.urutan,
    bobot: Number(r.bobot),
    soal: (Array.isArray(r.soal) ? r.soal[0] : r.soal) as SoalUjianBaris["soal"],
  }));
  const idSudahAda = new Set(baris.map((b) => b.soal_id));
  const totalSoal = baris.length;
  const totalBobot = baris.reduce((total, b) => total + b.bobot, 0);

  const sections = dataSection ?? [];
  const grup = [
    ...sections.map((s) => ({ section: s, daftar: baris.filter((b) => b.section_id === s.id) })),
    // Soal lama tanpa bagian (sebelum bagian otomatis) tetap ditampilkan
    { section: null, daftar: baris.filter((b) => b.section_id === null) },
  ].filter((g) => g.daftar.length > 0);

  const listTersedia = (soalBank ?? []).filter((soal) => !idSudahAda.has(soal.id));
  const tersediaPerTipe = hitungPerTipe(listTersedia);
  const totalPerTipe = hitungPerTipe(soalBank ?? []);

  const jumlahKelas = (ujian.ujian_kelas ?? []).length;
  const hrefTulisSoal = `/dashboard/soal/buat?${new URLSearchParams({
    ...(bank ? { bank } : {}),
    kembali: `/dashboard/ujian/${ujianId}/soal${bank ? `?bank=${bank}` : ""}`,
  }).toString()}`;

  return (
    <>
      <KepalaHalaman
        judul={ujian.judul}
        deskripsi={[namaMapel(ujian.mapel_ref), `${ujian.durasi} menit`].filter(Boolean).join(", ")}
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
      />
      <PenandaLangkah aktif="soal" kondisi={{ ujianId, jumlahSoal: totalSoal, jumlahKelas }} />

      <div className="space-y-4">
        {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
        {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}
      </div>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Ambil dari bank: di atas pada layar kecil, di kanan pada layar lebar */}
        <Kartu
          judul="Ambil soal dari bank"
          deskripsi="Pilih bank, centang tipe soal. Semua soal tipe itu masuk ke ujian, dikelompokkan per tipe."
          tanpaPadding
          className="lg:sticky lg:top-8 lg:order-2"
        >
          {!bankAktif ? (
            <KeadaanKosong
              ikon="soal"
              judul="Belum ada bank soal"
              deskripsi="Soal ujian diambil dari bank. Buat bank dan tulis soalnya dulu."
              aksi={<TautanTombol href="/dashboard/soal/bank/buat" teks="Buat bank soal" jenis="utama" ikon="tambah" />}
            />
          ) : (
            <>
              <nav aria-label="Pilih bank" className="flex flex-wrap gap-1.5 border-b border-garis bg-kertas/40 px-5 py-3">
                {listBank.map((b) => {
                  const aktif = b.id === bank;
                  return (
                    <Link
                      key={b.id}
                      href={`/dashboard/ujian/${ujianId}/soal?bank=${b.id}`}
                      aria-current={aktif ? "page" : undefined}
                      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${
                        aktif ? "bg-papan text-white" : "bg-permukaan text-tinta-2 ring-1 ring-garis ring-inset hover:text-tinta"
                      }`}
                    >
                      {b.nama}
                    </Link>
                  );
                })}
              </nav>

              {(soalBank ?? []).length === 0 ? (
                <KeadaanKosong
                  ikon="soal"
                  judul="Bank ini masih kosong"
                  deskripsi="Tulis soal di bank ini, atau pilih bank lain."
                  aksi={<TautanTombol href={hrefTulisSoal} teks="Tulis soal" jenis="utama" ikon="tambah" />}
                />
              ) : (
                <form action={ambilSoalPerTipe} className="space-y-2 p-5">
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  <input type="hidden" name="bank" value={bank} />
                  {URUTAN_TIPE.filter((tipe) => totalPerTipe[tipe] > 0).map((tipe) => {
                    const tersedia = tersediaPerTipe[tipe];
                    return (
                      <label
                        key={tipe}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                          tersedia === 0
                            ? "cursor-not-allowed border-garis bg-kertas opacity-70"
                            : "cursor-pointer border-garis-tegas has-[:checked]:border-nila has-[:checked]:bg-nila-muda"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            name="tipe"
                            value={tipe}
                            defaultChecked={tersedia > 0}
                            disabled={tersedia === 0}
                            className="h-4 w-4 accent-[var(--color-nila)]"
                          />
                          <span className="text-sm font-semibold text-tinta">{NAMA_TIPE[tipe]}</span>
                        </span>
                        <span className="text-xs text-tinta-2">{tersedia === 0 ? "Sudah semua masuk" : `${tersedia} soal`}</span>
                      </label>
                    );
                  })}
                  {listTersedia.length > 0 ? (
                    <Tombol teks="Masukkan ke ujian" ikon="tambah" teksProses="Memasukkan..." className="mt-2 w-full" />
                  ) : (
                    <p className="pt-1 text-sm text-tinta-2">Semua soal dari bank ini sudah ada di ujian.</p>
                  )}
                </form>
              )}

              {listTersedia.length > 0 && (
                <details className="border-t border-garis">
                  <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-tinta-2 hover:text-tinta">
                    Pilih soal satu per satu
                  </summary>
                  <form action={tambahSoalUjian}>
                    <input type="hidden" name="ujian_id" value={ujianId} />
                    <input type="hidden" name="bank" value={bank} />
                    <ul className="max-h-[50vh] divide-y divide-garis overflow-y-auto border-t border-garis">
                      {listTersedia.map((soal) => (
                        <li key={soal.id}>
                          <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-kertas has-[:checked]:bg-nila-muda">
                            <input type="checkbox" name="soal_ids[]" value={soal.id} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-nila)]" />
                            <span className="min-w-0">
                              <span className="line-clamp-2 whitespace-pre-wrap text-sm text-tinta">{soal.teks}</span>
                              <span className="mt-1 block">
                                <LencanaTipeSoal tipe={soal.tipe} />
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-garis p-4">
                      <Tombol teks="Tambahkan yang dicentang" jenis="kedua" teksProses="Menambahkan..." className="w-full" />
                    </div>
                  </form>
                </details>
              )}

              <div className="border-t border-garis px-5 py-3 text-center">
                <Link href={hrefTulisSoal} className="text-sm font-semibold text-nila hover:underline">
                  + Tulis soal baru di bank ini
                </Link>
              </div>
            </>
          )}
        </Kartu>

        {/* Isi ujian, dikelompokkan per bagian (satu bagian per tipe) */}
        <Kartu
          judul="Soal di ujian ini"
          deskripsi={
            totalSoal === 0
              ? "Belum ada soal."
              : `${totalSoal} soal, total bobot ${totalBobot}. Siswa mengerjakan per bagian dari atas ke bawah dan tidak bisa kembali ke bagian sebelumnya.`
          }
          tanpaPadding
          className="lg:order-1"
        >
          {totalSoal === 0 ? (
            <KeadaanKosong ikon="soal" judul="Belum ada soal" deskripsi="Centang tipe soal di panel Ambil soal dari bank, lalu Masukkan ke ujian." />
          ) : (
            <div className="divide-y divide-garis">
              {(() => {
                let nomor = 0;
                return grup.map((g, indeksGrup) => {
                  const indeksSection = g.section ? sections.findIndex((s) => s.id === g.section!.id) : -1;
                  return (
                    <section key={g.section?.id ?? "tanpa"}>
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-kertas/60 px-5 py-2.5">
                        <p className="text-sm font-semibold text-tinta">
                          {g.section ? `Bagian ${indeksGrup + 1} · ${namaBagian(g.section.tipe)}` : "Tanpa bagian"}
                          <span className="ml-2 font-normal text-tinta-2">{g.daftar.length} soal</span>
                        </p>
                        {g.section && (
                          <div className="flex items-center gap-1">
                            {sections.length > 1 && (
                              <>
                                <form action={geserSection}>
                                  <input type="hidden" name="ujian_id" value={ujianId} />
                                  <input type="hidden" name="id" value={g.section.id} />
                                  <input type="hidden" name="arah" value="atas" />
                                  <input type="hidden" name="bank" value={bank} />
                                  <Tombol teks="Naik" jenis="hantu" ukuran="kecil" disabled={indeksSection === 0} />
                                </form>
                                <form action={geserSection}>
                                  <input type="hidden" name="ujian_id" value={ujianId} />
                                  <input type="hidden" name="id" value={g.section.id} />
                                  <input type="hidden" name="arah" value="bawah" />
                                  <input type="hidden" name="bank" value={bank} />
                                  <Tombol teks="Turun" jenis="hantu" ukuran="kecil" disabled={indeksSection === sections.length - 1} />
                                </form>
                              </>
                            )}
                            <form action={kosongkanBagian}>
                              <input type="hidden" name="ujian_id" value={ujianId} />
                              <input type="hidden" name="section_id" value={g.section.id} />
                              <input type="hidden" name="bank" value={bank} />
                              <TombolKonfirmasi
                                teks="Kosongkan"
                                jenis="hantu"
                                ukuran="kecil"
                                pesanKonfirmasi={`Keluarkan semua ${g.daftar.length} soal ${namaBagian(g.section.tipe)} dari ujian ini? Soal di bank tetap ada.`}
                                className="hover:text-merah"
                              />
                            </form>
                          </div>
                        )}
                      </div>
                      <ol className="divide-y divide-garis">
                        {g.daftar.map((b) => {
                          nomor++;
                          return (
                            <li key={b.soal_id} className="flex items-start gap-4 px-5 py-3">
                              <span className="angka w-6 shrink-0 pt-0.5 text-right text-sm font-semibold text-tinta-3">{nomor}</span>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 whitespace-pre-wrap text-sm text-tinta">{b.soal?.teks}</p>
                                <p className="mt-1 text-xs text-tinta-2">Bobot {b.bobot}</p>
                              </div>
                              <form action={hapusSoalUjian} className="shrink-0">
                                <input type="hidden" name="ujian_id" value={ujianId} />
                                <input type="hidden" name="soal_id" value={b.soal_id} />
                                <input type="hidden" name="bank" value={bank} />
                                <Tombol teks="Keluarkan" jenis="hantu" ukuran="kecil" teksProses="..." className="hover:text-merah" />
                              </form>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  );
                });
              })()}
            </div>
          )}
        </Kartu>
      </div>

      {/* Navigasi langkah */}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-garis pt-5 sm:flex-row sm:items-center sm:justify-between">
        <TautanTombol href={`/dashboard/ujian/${ujianId}/ubah`} teks="Kembali: info ujian" jenis="hantu" ikon="kembali" />
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <TautanTombol href={`/dashboard/ujian/${ujianId}/peserta`} teks="Lanjut: peserta & aturan" jenis={totalSoal > 0 ? "utama" : "kedua"} />
          {totalSoal === 0 && <p className="text-xs text-tinta-2">Belum ada soal. Anda tetap bisa lanjut dan kembali nanti.</p>}
        </div>
      </div>
    </>
  );
}

export default function AmbilSoalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamSoal }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
      <HalamanDenganParam params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanDenganParam({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamSoal }) {
  const { id } = await params;
  return <AmbilSoal ujianId={id} searchParams={searchParams} />;
}
