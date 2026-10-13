import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai, rataRataNilai, rekapPerSoal, sebaranNilai } from "@/lib/nilai";
import { hitungNilaiOtomatis, tandaiDinilai } from "@/actions/nilai";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { Lencana, LencanaStatusUjian, LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Nilai" };

type ParamNilai = { error?: string; sukses?: string; kelas?: string };

function hrefKelas(ujianId: string, namaKelas: string) {
  return namaKelas ? `/dashboard/ujian/${ujianId}/nilai?kelas=${encodeURIComponent(namaKelas)}` : `/dashboard/ujian/${ujianId}/nilai`;
}

async function RekapNilai({ ujianId, searchParams }: { ujianId: string; searchParams: Promise<ParamNilai> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) redirect("/dashboard/ujian");

  const { ujian, listSoal, skorMaksimal, listBaris } = rekap;
  const { error: errorQuery, sukses: pesanSukses, kelas: kelasDipilih = "" } = await searchParams;
  const sudahSelesai = ujian.status === "selesai" || ujian.status === "dinilai";

  const listNamaKelas = [...new Set(listBaris.map((baris) => baris.namaKelas))];
  const listBarisTampil = kelasDipilih ? listBaris.filter((baris) => baris.namaKelas === kelasDipilih) : listBaris;

  let jumlahEssayBelumDikoreksi = 0;
  for (const baris of listBaris) jumlahEssayBelumDikoreksi += baris.essayBelumDikoreksi;
  const adaEssay = listSoal.some((soal) => soal.tipe === "essay");
  const pesertaBelumDikoreksi = listBaris.find((baris) => baris.essayBelumDikoreksi > 0);

  let nilaiTertinggi = 0;
  let nilaiTerendah = listBarisTampil.length > 0 ? 100 : 0;
  for (const baris of listBarisTampil) {
    nilaiTertinggi = Math.max(nilaiTertinggi, baris.nilai);
    nilaiTerendah = Math.min(nilaiTerendah, baris.nilai);
  }

  const statPerSoal = rekapPerSoal(listSoal, listBarisTampil);
  const sebaran = sebaranNilai(listBarisTampil);
  const puncakSebaran = Math.max(1, ...sebaran.map((item) => item.jumlah));

  return (
    <>
      <KepalaHalaman
        judul={`Nilai ${ujian.judul}`}
        deskripsi={
          <span className="inline-flex flex-wrap items-center gap-2">
            <LencanaStatusUjian status={ujian.status} />
            <span>
              {listSoal.length} soal, skor maksimal {skorMaksimal}
            </span>
          </span>
        }
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
        aksi={
          sudahSelesai && (
            <>
              <form action={hitungNilaiOtomatis}>
                <input type="hidden" name="ujian_id" value={ujianId} />
                <Tombol teks="Hitung ulang PG & B/S" jenis="kedua" ikon="putar" teksProses="Menghitung..." />
              </form>
              <TautanTombol href={`/dashboard/ujian/${ujianId}/nilai/ekspor`} teks="Unduh Excel (.xlsx)" jenis="kedua" ikon="unduh" unduh />
            </>
          )
        }
      />

      {!sudahSelesai ? (
        <Kartu>
          <KeadaanKosong
            ikon="jam"
            judul="Ujian belum selesai"
            deskripsi="Nilai muncul di sini setelah ujian diakhiri dari ruang kontrol."
            aksi={<TautanTombol href={`/dashboard/ujian/${ujianId}/lobby`} teks="Buka ruang kontrol" jenis="utama" />}
          />
        </Kartu>
      ) : (
        <div className="space-y-6">
          {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
          {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}

          {ujian.status === "selesai" &&
            (adaEssay && jumlahEssayBelumDikoreksi > 0 ? (
              <section className="flex flex-col gap-3 rounded-xl border border-kuning/25 bg-kuning-muda p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-kuning">{jumlahEssayBelumDikoreksi} jawaban essay menunggu dikoreksi</p>
                  <p className="text-sm text-kuning/80">Nilai akhir baru lengkap setelah semua essay diberi skor.</p>
                </div>
                {pesertaBelumDikoreksi && (
                  <TautanTombol href={`/dashboard/ujian/${ujianId}/nilai/${pesertaBelumDikoreksi.pesertaId}`} teks="Mulai koreksi" jenis="utama" />
                )}
              </section>
            ) : (
              <section className="flex flex-col gap-3 rounded-xl border border-hijau/25 bg-hijau-muda p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-hijau">Semua jawaban sudah dinilai</p>
                  <p className="text-sm text-hijau/80">Tandai selesai agar ujian ini tercatat sudah dinilai.</p>
                </div>
                <form action={tandaiDinilai}>
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  <Tombol teks="Tandai selesai dinilai" ikon="centang" teksProses="Menyimpan..." />
                </form>
              </section>
            ))}

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-garis bg-garis sm:grid-cols-4">
            {[
              { teks: "Peserta", nilai: listBarisTampil.length },
              { teks: "Rata-rata", nilai: rataRataNilai(listBarisTampil) },
              { teks: "Tertinggi", nilai: nilaiTertinggi },
              { teks: "Terendah", nilai: nilaiTerendah },
            ].map((item) => (
              <div key={item.teks} className="bg-permukaan px-5 py-4">
                <dt className="text-sm text-tinta-2">{item.teks}</dt>
                <dd className="angka mt-1 text-2xl font-bold text-tinta">{item.nilai}</dd>
              </div>
            ))}
          </dl>

          {listBarisTampil.length > 0 && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Kartu judul="Rekap per soal" deskripsi="Distribusi jawaban tiap soal" tanpaPadding>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-garis text-xs font-semibold text-tinta-2">
                      <tr>
                        <th className="px-5 py-2.5">No</th>
                        <th className="px-3 py-2.5">Soal</th>
                        <th className="px-3 py-2.5 text-right">Benar / Rata²</th>
                        <th className="px-3 py-2.5 text-right">Salah</th>
                        <th className="px-3 py-2.5 text-right">Kosong</th>
                        <th className="px-3 py-2.5 text-right">Belum</th>
                        <th className="px-5 py-2.5 text-right">% benar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-garis">
                      {statPerSoal.map((stat) => (
                        <tr key={stat.soal.soalId} className="hover:bg-kertas">
                          <td className="angka px-5 py-3 text-tinta-2">{stat.soal.urutan}</td>
                          <td className="max-w-[220px] px-3 py-3">
                            <span className="line-clamp-1 text-tinta">{stat.soal.teks || "(tanpa teks)"}</span>
                            <span className="mt-1 inline-block">
                              <LencanaTipeSoal tipe={stat.soal.tipe} />
                            </span>
                          </td>
                          <td className="angka px-3 py-3 text-right">
                            {stat.soal.tipe === "essay" ? (
                              stat.rataRataSkor === null ? (
                                <span className="text-tinta-3">-</span>
                              ) : (
                                stat.rataRataSkor
                              )
                            ) : (
                              <span className="font-semibold text-hijau">{stat.benar}</span>
                            )}
                          </td>
                          <td className="angka px-3 py-3 text-right text-merah">
                            {stat.soal.tipe === "essay" ? <span className="text-tinta-3">-</span> : stat.salah}
                          </td>
                          <td className="angka px-3 py-3 text-right text-tinta-2">{stat.kosong}</td>
                          <td className="angka px-3 py-3 text-right">
                            {stat.belumDikoreksi > 0 ? <span className="font-semibold text-kuning">{stat.belumDikoreksi}</span> : <span className="text-tinta-3">-</span>}
                          </td>
                          <td className="angka px-5 py-3 text-right font-semibold text-tinta">
                            {stat.persenBenar === null ? <span className="text-tinta-3">-</span> : `${stat.persenBenar}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Kartu>

              <Kartu judul="Sebaran nilai" deskripsi="Jumlah siswa per rentang nilai">
                <ul className="flex h-44 items-end gap-1.5">
                  {sebaran.map((item) => (
                    <li key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="angka text-xs font-semibold text-tinta-2">{item.jumlah > 0 ? item.jumlah : ""}</span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t bg-nila"
                          style={{ height: `${(item.jumlah / puncakSebaran) * 100}%`, minHeight: item.jumlah > 0 ? "4px" : "0" }}
                        />
                      </div>
                      <span className="text-[11px] text-tinta-3">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </Kartu>
            </div>
          )}

          <Kartu tanpaPadding>
            {listNamaKelas.length > 1 && (
              <nav aria-label="Saring kelas" className="flex gap-1 overflow-x-auto border-b border-garis px-5 py-3">
                {["", ...listNamaKelas].map((namaKelas) => {
                  const aktif = kelasDipilih === namaKelas;
                  const barisKelas = namaKelas ? listBaris.filter((baris) => baris.namaKelas === namaKelas) : listBaris;
                  return (
                    <Link
                      key={namaKelas || "semua"}
                      href={hrefKelas(ujianId, namaKelas)}
                      aria-current={aktif ? "page" : undefined}
                      className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                        aktif ? "bg-nila-muda text-nila" : "text-tinta-2 hover:bg-kertas hover:text-tinta"
                      }`}
                    >
                      {namaKelas || "Semua kelas"}
                      <span className="angka text-xs font-medium opacity-70">rata-rata {rataRataNilai(barisKelas)}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {listBarisTampil.length === 0 ? (
              <KeadaanKosong ikon="kelas" judul="Tidak ada peserta" deskripsi="Tidak ada siswa yang mengikuti ujian ini." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-garis text-xs font-semibold text-tinta-2">
                    <tr>
                      <th className="px-5 py-2.5">Siswa</th>
                      <th className="px-3 py-2.5 text-right">PG & B/S</th>
                      {adaEssay && <th className="px-3 py-2.5 text-right">Essay</th>}
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right">Nilai</th>
                      <th className="px-5 py-2.5 text-right">Pelanggaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-garis">
                    {listBarisTampil.map((baris) => (
                      <tr key={baris.pesertaId} className="hover:bg-kertas">
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/ujian/${ujianId}/nilai/${baris.pesertaId}`} className="font-semibold text-tinta hover:text-nila">
                            {baris.nama}
                          </Link>
                          <span className="block text-xs text-tinta-2">
                            {baris.namaKelas}, no. {baris.noAbsen ?? "-"}
                          </span>
                        </td>
                        <td className="angka px-3 py-3 text-right">{baris.skorOtomatis}</td>
                        {adaEssay && (
                          <td className="px-3 py-3 text-right">
                            {baris.essayBelumDikoreksi > 0 ? (
                              <Link href={`/dashboard/ujian/${ujianId}/nilai/${baris.pesertaId}`}>
                                <Lencana nada="kuning">{baris.essayBelumDikoreksi} belum dikoreksi</Lencana>
                              </Link>
                            ) : (
                              <span className="angka">{baris.skorEssay}</span>
                            )}
                          </td>
                        )}
                        <td className="angka px-3 py-3 text-right text-tinta-2">
                          {baris.totalSkor}/{skorMaksimal}
                        </td>
                        <td className="angka px-3 py-3 text-right text-base font-bold text-tinta">{baris.nilai}</td>
                        <td className="px-5 py-3 text-right">
                          {baris.jumlahPelanggaran > 0 ? (
                            <span className="angka font-semibold text-merah">{baris.jumlahPelanggaran}</span>
                          ) : (
                            <span className="text-tinta-3">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Kartu>
        </div>
      )}
    </>
  );
}

export default function NilaiPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParamNilai> }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat nilai...</p>}>
      <HalamanNilai params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanNilai({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParamNilai> }) {
  const { id } = await params;
  return <RekapNilai ujianId={id} searchParams={searchParams} />;
}
