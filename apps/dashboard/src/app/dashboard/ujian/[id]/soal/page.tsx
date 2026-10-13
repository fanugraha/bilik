import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tambahSoalUjian, hapusSoalUjian, generateKode } from "@/actions/ujian";
import { Tombol } from "@/components/ui/button";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Atur soal ujian" };

async function AturSoalUjian({ ujianId, searchParams }: { ujianId: string; searchParams: Promise<{ error?: string; bank?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, mapel, durasi, acak_soal, acak_opsi, batas_pelanggaran, status, ujian_kelas(kelas(nama))")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "draft") redirect(`/dashboard/ujian/${ujianId}/lobby`);

  const [{ data: soalUjian }, { data: semuaSoal }, { data: daftarBank }] = await Promise.all([
    supabase.from("ujian_soal").select("soal_id, urutan, bobot").eq("ujian_id", ujianId).order("urutan", { ascending: true }),
    supabase.from("soal").select("id, tipe, teks, bobot, bank_soal_id").eq("guru_id", user.id).order("created_at", { ascending: false }),
    supabase.from("bank_soal").select("id, nama").eq("guru_id", user.id).order("nama", { ascending: true }),
  ]);

  const soalPerId = new Map((semuaSoal ?? []).map((soal) => [soal.id, soal]));
  const idSoalTerpilih = new Set((soalUjian ?? []).map((baris) => baris.soal_id));
  const soalTersedia = (semuaSoal ?? []).filter((soal) => !idSoalTerpilih.has(soal.id));

  const { error: errorQuery, bank = "" } = await searchParams;

  const bankList = daftarBank ?? [];
  const namaBank = new Map(bankList.map((b) => [b.id, b.nama]));
  const bankTerpilih = bankList.some((b) => b.id === bank) ? bank : "";
  const soalTampil = bankTerpilih ? soalTersedia.filter((soal) => soal.bank_soal_id === bankTerpilih) : soalTersedia;
  // Menulis soal dari sini kembali ke halaman ini, tidak tersesat di Bank soal
  const hrefTulisSoal = `/dashboard/soal/buat?${new URLSearchParams({
    ...(bankTerpilih ? { bank: bankTerpilih } : {}),
    kembali: `/dashboard/ujian/${ujianId}/soal${bankTerpilih ? `?bank=${bankTerpilih}` : ""}`,
  }).toString()}`;

  let totalBobot = 0;
  for (const baris of soalUjian ?? []) totalBobot += Number(baris.bobot);

  const listNamaKelas = ((ujian.ujian_kelas ?? []) as { kelas: { nama: string } | { nama: string }[] | null }[])
    .map((baris) => (Array.isArray(baris.kelas) ? baris.kelas[0]?.nama : baris.kelas?.nama))
    .filter(Boolean);

  const jumlahSoal = soalUjian?.length ?? 0;

  return (
    <>
      <KepalaHalaman
        judul={ujian.judul}
        deskripsi={
          [ujian.mapel, `${ujian.durasi} menit`, listNamaKelas.length > 0 ? `kelas ${listNamaKelas.join(", ")}` : "belum ada kelas peserta"]
            .filter(Boolean)
            .join(", ")
        }
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
        aksi={
          <>
            <TautanTombol href={`/dashboard/ujian/${ujianId}/ubah`} teks="Ubah pengaturan" jenis="kedua" />
            {jumlahSoal > 0 && listNamaKelas.length > 0 && (
              <form action={generateKode}>
                <input type="hidden" name="ujian_id" value={ujianId} />
                <TombolKonfirmasi
                  teks="Buka lobby"
                  pesanKonfirmasi="Buka lobby sekarang? Kode ujian akan dibuat dan soal tidak bisa diubah lagi."
                />
              </form>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
        {listNamaKelas.length === 0 && (
          <Pesan jenis="peringatan">Pilih minimal satu kelas peserta di Ubah pengaturan sebelum membuka lobby.</Pesan>
        )}
      </div>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Kartu
          judul="Soal di ujian ini"
          deskripsi={jumlahSoal === 0 ? "Belum ada soal dipilih." : `${jumlahSoal} soal, total bobot ${totalBobot}`}
          tanpaPadding
        >
          {jumlahSoal === 0 ? (
            <KeadaanKosong ikon="soal" judul="Pilih soal dari bank soal" deskripsi="Centang soal di panel sebelah, lalu tambahkan ke ujian." />
          ) : (
            <ol className="divide-y divide-garis">
              {(soalUjian ?? []).map((baris, indeks) => {
                const soal = soalPerId.get(baris.soal_id);
                return (
                  <li key={baris.soal_id} className="flex items-start gap-4 px-5 py-3.5">
                    <span className="angka w-6 shrink-0 pt-0.5 text-right text-sm font-semibold text-tinta-3">{indeks + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-tinta">{soal?.teks}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {soal && <LencanaTipeSoal tipe={soal.tipe} />}
                        <span className="text-xs text-tinta-2">Bobot {baris.bobot}</span>
                      </div>
                    </div>
                    <form action={hapusSoalUjian}>
                      <input type="hidden" name="ujian_id" value={ujianId} />
                      <input type="hidden" name="soal_id" value={baris.soal_id} />
                      <Tombol teks="Keluarkan" jenis="hantu" ukuran="kecil" teksProses="..." className="hover:text-merah" />
                    </form>
                  </li>
                );
              })}
            </ol>
          )}
        </Kartu>

        <Kartu judul="Bank soal" deskripsi={`${soalTersedia.length} soal belum dipakai di ujian ini`} tanpaPadding className="lg:sticky lg:top-8">
          {bankList.length > 0 && soalTersedia.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-garis bg-kertas/40 px-5 py-3">
              <span className="mr-1 text-xs font-semibold text-tinta-3">Bank:</span>
              <Link
                href={`/dashboard/ujian/${ujianId}/soal`}
                aria-current={bankTerpilih === "" ? "page" : undefined}
                className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${
                  bankTerpilih === "" ? "bg-papan text-white" : "bg-permukaan text-tinta-2 ring-1 ring-garis ring-inset hover:text-tinta"
                }`}
              >
                Semua
              </Link>
              {bankList.map((b) => {
                const aktif = bankTerpilih === b.id;
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
            </div>
          )}

          {soalTersedia.length === 0 ? (
            <KeadaanKosong
              ikon="soal"
              judul={(semuaSoal ?? []).length === 0 ? "Bank soal kosong" : "Semua soal sudah dipakai"}
              deskripsi="Tulis soal baru. Setelah disimpan, Anda kembali ke halaman ini."
              aksi={<TautanTombol href={hrefTulisSoal} teks="Tulis soal" jenis="utama" ikon="tambah" />}
            />
          ) : soalTampil.length === 0 ? (
            <KeadaanKosong
              ikon="cari"
              judul="Tidak ada soal di bank ini"
              deskripsi="Semua soal bank ini sudah dipakai, atau banknya masih kosong. Pilih bank lain."
              aksi={<TautanTombol href={`/dashboard/ujian/${ujianId}/soal`} teks="Tampilkan semua soal" />}
            />
          ) : (
            <>
              <form action={tambahSoalUjian}>
                <input type="hidden" name="ujian_id" value={ujianId} />
                <ul className="max-h-[60vh] divide-y divide-garis overflow-y-auto">
                  {soalTampil.map((soal) => (
                    <li key={soal.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-kertas has-[:checked]:bg-nila-muda">
                        <input type="checkbox" name="soal_ids[]" value={soal.id} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-nila)]" />
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-sm text-tinta">{soal.teks}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <LencanaTipeSoal tipe={soal.tipe} />
                            <span className="text-xs text-tinta-2">Bobot {soal.bobot}</span>
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-garis p-4">
                  <Tombol teks="Tambahkan soal yang dicentang" ikon="tambah" teksProses="Menambahkan..." className="w-full" />
                </div>
              </form>

              {bankTerpilih && (
                <form action={tambahSoalUjian} className="border-t border-garis bg-kertas/40 p-4">
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  {soalTampil.map((soal) => (
                    <input key={soal.id} type="hidden" name="soal_ids[]" value={soal.id} />
                  ))}
                  <Tombol
                    teks={`Tambah semua ${soalTampil.length} soal dari bank ${namaBank.get(bankTerpilih) ?? ""}`}
                    ikon="tambah"
                    jenis="kedua"
                    teksProses="Menambahkan..."
                    className="w-full"
                  />
                </form>
              )}

              <div className="border-t border-garis px-5 py-3 text-center">
                <Link href={hrefTulisSoal} className="text-sm font-semibold text-nila hover:underline">
                  + Tulis soal baru untuk ujian ini
                </Link>
              </div>
            </>
          )}
        </Kartu>
      </div>
    </>
  );
}

export default function AturSoalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
      <HalamanAturSoal params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanAturSoal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  return <AturSoalUjian ujianId={id} searchParams={searchParams} />;
}
