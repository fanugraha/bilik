import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai, lulus, rataRataNilai, rekapPerSoal, sebaranNilai } from "@/lib/nilai";
import { hitungNilaiOtomatis, tandaiDinilai } from "@/actions/nilai";
import { Tombol } from "@/components/ui/button";
import { Ikon } from "@/components/ui/ikon";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { Lencana, LencanaStatusUjian, LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Nilai" };

type ParamNilai = { error?: string; sukses?: string; kelas?: string; urut?: string };

// Tautan saring/urut yang mempertahankan pilihan lain (kelas <-> urut)
function hrefSaring(ujianId: string, opsi: { kelas?: string; urut?: string }) {
  const param = new URLSearchParams();
  if (opsi.kelas) param.set("kelas", opsi.kelas);
  if (opsi.urut) param.set("urut", opsi.urut);
  const teks = param.toString();
  return `/dashboard/ujian/${ujianId}/nilai${teks ? `?${teks}` : ""}`;
}

const kelasChip = (aktif: boolean) =>
  `inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
    aktif ? "bg-nila-muda text-nila" : "text-tinta-2 hover:bg-kertas hover:text-tinta"
  }`;

const urutChip = kelasChip;

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
  const kkm = ujian.kkm;
  const { error: errorQuery, sukses: pesanSukses, kelas: kelasDipilih = "", urut = "" } = await searchParams;
  const sudahSelesai = ujian.status === "selesai" || ujian.status === "dinilai";

  const listNamaKelas = [...new Set(listBaris.map((baris) => baris.namaKelas))];

  // Saring kelas dulu, lalu urutkan sesuai pilihan.
  const listBarisTampil = kelasDipilih ? listBaris.filter((baris) => baris.namaKelas === kelasDipilih) : [...listBaris];
  if (urut === "nilai") {
    listBarisTampil.sort((a, b) => b.nilai - a.nilai || a.nama.localeCompare(b.nama));
  } else if (urut === "belum") {
    listBarisTampil.sort((a, b) => Number(b.belumDinilai > 0) - Number(a.belumDinilai > 0));
  }

  let jumlahBelumDinilai = 0;
  for (const baris of listBaris) jumlahBelumDinilai += baris.belumDinilai;
  const adaSoalManual = listSoal.some((soal) => soal.tipe !== "pg");
  const adaSoalObjektif = listSoal.some((soal) => soal.tipe === "pg");

  // Kemajuan koreksi manual (inilah kerja manual guru): benar/salah, essay, angket.
  const tipePerSoal = new Map(listSoal.map((soal) => [soal.soalId, soal.tipe]));
  let totalManualDijawab = 0;
  for (const baris of listBaris) {
    for (const jawaban of baris.listJawaban) {
      if (tipePerSoal.get(jawaban.soalId) !== "pg" && jawaban.isi) totalManualDijawab++;
    }
  }
  const totalManualDinilai = Math.max(0, totalManualDijawab - jumlahBelumDinilai);
  const persenKoreksi = totalManualDijawab > 0 ? Math.round((totalManualDinilai / totalManualDijawab) * 100) : 100;
  const jumlahSiswaBelumDinilai = listBarisTampil.filter((baris) => baris.belumDinilai > 0).length;
  const pesertaBelumDinilai = listBarisTampil.find((baris) => baris.belumDinilai > 0);

  let nilaiTertinggi = 0;
  let nilaiTerendah = 0;
  let jumlahLulus = 0;
  if (listBarisTampil.length > 0) nilaiTerendah = 100;
  for (const baris of listBarisTampil) {
    nilaiTertinggi = Math.max(nilaiTertinggi, baris.nilai);
    nilaiTerendah = Math.min(nilaiTerendah, baris.nilai);
    if (lulus(baris.nilai, kkm)) jumlahLulus++;
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
              {listSoal.length} soal, skor maksimal {skorMaksimal}, KKM {kkm}
            </span>
          </span>
        }
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
        aksi={
          sudahSelesai && (
            <>
              <form action={hitungNilaiOtomatis}>
                <input type="hidden" name="ujian_id" value={ujianId} />
                <Tombol teks="Hitung ulang PG otomatis" jenis="kedua" ikon="putar" teksProses="Menghitung..." />
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
            (jumlahBelumDinilai > 0 ? (
              <section className="rounded-xl border border-kuning/25 bg-kuning-muda p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-kuning">
                      {jumlahBelumDinilai} jawaban belum dinilai di {jumlahSiswaBelumDinilai} siswa
                    </p>
                    <p className="text-sm text-kuning/80">
                      {totalManualDinilai} dari {totalManualDijawab} jawaban manual sudah diberi skor. Nilai akhir baru lengkap setelah semua jawaban dinilai.
                    </p>
                  </div>
                  {pesertaBelumDinilai && (
                    <TautanTombol
                      href={`/dashboard/ujian/${ujianId}/nilai/${pesertaBelumDinilai.pesertaId}`}
                      teks="Mulai nilai"
                      jenis="utama"
                    />
                  )}
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-permukaan" role="presentation">
                  <div className="h-full rounded-full bg-kuning" style={{ width: `${persenKoreksi}%` }} />
                </div>
              </section>
            ) : (
              <section className="flex flex-col gap-3 rounded-xl border border-hijau/25 bg-hijau-muda p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-hijau">
                    {adaSoalManual ? `Semua ${totalManualDijawab} jawaban manual sudah dinilai` : "Semua jawaban dinilai otomatis"}
                  </p>
                  <p className="text-sm text-hijau/80">Tandai selesai agar ujian ini tercatat sudah dinilai.</p>
                </div>
                <form action={tandaiDinilai}>
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  <Tombol teks="Tandai selesai dinilai" ikon="centang" teksProses="Menyimpan..." />
                </form>
              </section>
            ))}

          {ujian.status === "dinilai" && (
            <section className="rounded-xl border border-ungu/20 bg-ungu-muda p-5">
              <p className="font-semibold text-ungu">Ujian sudah ditandai dinilai</p>
              <p className="text-sm text-ungu/80">Nilai ini sudah final. Butuh ubah skor? Koreksi ulang lewat daftar siswa di bawah, lalu hitung ulang nilai otomatis.</p>
            </section>
          )}

          {/* Daftar siswa dulu, urut nomor absen. Klik nama -> jawaban siswa untuk dinilai. */}
          <Kartu
            judul="Daftar siswa"
            deskripsi={
              <>
                Nilai = skor total dibagi skor maksimal (0-100). PG dinilai otomatis; benar/salah, essay, dan angket dinilai manual. Klik nama untuk menilai.
                {adaSoalManual ? " Nilai bertanda sementara muncul sampai semua jawaban manual diberi skor." : ""}
              </>
            }
            tanpaPadding
          >
            <nav aria-label="Saring dan urutkan" className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-garis px-5 py-3">
              {listNamaKelas.length > 1 && (
                <div className="flex gap-1 overflow-x-auto">
                  {["", ...listNamaKelas].map((namaKelas) => {
                    const aktif = kelasDipilih === namaKelas;
                    const barisKelas = namaKelas ? listBaris.filter((baris) => baris.namaKelas === namaKelas) : listBaris;
                    return (
                      <Link
                        key={namaKelas || "semua"}
                        href={hrefSaring(ujianId, { kelas: namaKelas, urut })}
                        aria-current={aktif ? "page" : undefined}
                        className={kelasChip(aktif)}
                      >
                        {namaKelas || "Semua kelas"}
                        <span className="angka text-xs font-medium opacity-70">rata-rata {rataRataNilai(barisKelas)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div className="ml-auto flex items-center gap-1">
                <span className="px-1 text-xs font-medium text-tinta-3">Urut</span>
                {[
                  { kunci: "", teks: "No. absen" },
                  ...(adaSoalManual ? [{ kunci: "belum", teks: "Belum dinilai" }] : []),
                  { kunci: "nilai", teks: "Nilai tertinggi" },
                ].map((pilihan) => (
                  <Link
                    key={pilihan.kunci || "absen"}
                    href={hrefSaring(ujianId, { kelas: kelasDipilih, urut: pilihan.kunci })}
                    aria-current={urut === pilihan.kunci ? "page" : undefined}
                    className={urutChip(urut === pilihan.kunci)}
                  >
                    {pilihan.teks}
                  </Link>
                ))}
              </div>
            </nav>

            {listBarisTampil.length === 0 ? (
              <KeadaanKosong ikon="kelas" judul="Tidak ada peserta" deskripsi="Tidak ada siswa yang mengikuti ujian ini." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-garis text-xs font-semibold text-tinta-2">
                    <tr>
                      <th className="px-5 py-2.5">No</th>
                      <th className="px-3 py-2.5">Siswa</th>
                      <th className="px-3 py-2.5 text-right" title="Skor dari soal pilihan ganda yang dinilai sistem">
                        PG otomatis
                      </th>
                      {adaSoalManual && <th className="px-3 py-2.5 text-right">Manual</th>}
                      <th className="px-3 py-2.5 text-right" title="Jumlah skor dibagi skor maksimal">
                        Total skor
                      </th>
                      <th className="px-3 py-2.5 text-right" title="Skor total dalam skala 0-100 dibanding KKM">
                        Nilai
                      </th>
                      <th className="px-5 py-2.5 text-right">Pelanggaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-garis">
                    {listBarisTampil.map((baris) => (
                      <tr key={baris.pesertaId} className="hover:bg-kertas">
                        <td className="angka px-5 py-3 text-tinta-2">{baris.noAbsen ?? "-"}</td>
                        <td className="px-3 py-3">
                          <Link href={`/dashboard/ujian/${ujianId}/nilai/${baris.pesertaId}`} className="block font-semibold text-tinta hover:text-nila">
                            {baris.nama}
                          </Link>
                          <span className="block text-xs text-tinta-2">{baris.namaKelas}</span>
                        </td>
                        <td className="angka px-3 py-3 text-right">{baris.skorOtomatis}</td>
                        {adaSoalManual && (
                          <td className="px-3 py-3 text-right">
                            {baris.belumDinilai > 0 ? (
                              <Link href={`/dashboard/ujian/${ujianId}/nilai/${baris.pesertaId}`}>
                                <Lencana nada="kuning">{baris.belumDinilai} belum dinilai</Lencana>
                              </Link>
                            ) : (
                              <span className="angka">{baris.skorManual}</span>
                            )}
                          </td>
                        )}
                        <td className="angka px-3 py-3 text-right text-tinta-2">
                          {baris.totalSkor}/{skorMaksimal}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="angka block text-base font-bold text-tinta">{baris.nilai}</span>
                          {baris.belumDinilai > 0 ? (
                            <span className="block text-xs font-medium text-tinta-3">sementara</span>
                          ) : (
                            <span className={`block text-xs font-semibold ${lulus(baris.nilai, kkm) ? "text-hijau" : "text-merah"}`}>
                              {lulus(baris.nilai, kkm) ? "Lulus" : "Belum lulus"}
                            </span>
                          )}
                        </td>
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

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-garis bg-garis sm:grid-cols-3 lg:grid-cols-5">
            {[
              { teks: "Peserta", nilai: listBarisTampil.length },
              { teks: "Rata-rata", nilai: rataRataNilai(listBarisTampil) },
              { teks: "Tertinggi", nilai: nilaiTertinggi },
              { teks: "Terendah", nilai: nilaiTerendah },
              { teks: `Lulus (KKM ${kkm})`, nilai: jumlahLulus },
            ].map((item) => (
              <div key={item.teks} className="bg-permukaan px-5 py-4">
                <dt className="text-sm text-tinta-2">{item.teks}</dt>
                <dd className="angka mt-1 text-2xl font-bold text-tinta">{item.nilai}</dd>
              </div>
            ))}
          </dl>

          {listBarisTampil.length > 0 && (
            <div className="space-y-6">
              <Kartu judul="Sebaran nilai" deskripsi="Jumlah siswa per rentang nilai">
                <ul className="flex h-44 items-end gap-1.5">
                  {sebaran.map((item, indeks) => {
                    const batasAtas = (indeks + 1) * 10;
                    const batasBawah = indeks * 10;
                    const warna = batasAtas <= kkm ? "bg-merah" : batasBawah >= kkm ? "bg-hijau" : "bg-kuning";
                    return (
                      <li key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className="angka text-xs font-semibold text-tinta-2">{item.jumlah > 0 ? item.jumlah : ""}</span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={`w-full rounded-t ${warna}`}
                            style={{ height: `${(item.jumlah / puncakSebaran) * 100}%`, minHeight: item.jumlah > 0 ? "4px" : "0" }}
                          />
                        </div>
                        <span className="text-[11px] text-tinta-3">{item.label}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-tinta-2">
                  KKM {kkm}. Batang hijau = rentang di atas KKM, merah = di bawah, kuning = rentang yang melewati KKM.
                </p>
              </Kartu>

              {/* Analitik sekunder: membantu menilai mutu soal, bukan kerja utama. Dibuat runtuh agar tak bersaing dengan daftar siswa. */}
              {adaSoalObjektif && (
                <details className="group rounded-xl border border-garis bg-permukaan">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <div>
                      <h2 className="text-base font-semibold text-tinta">Analisis soal</h2>
                      <p className="mt-0.5 text-sm text-tinta-2">
                        Ringkasan tiap soal: benar/salah untuk PG, rata-rata skor untuk soal manual (benar/salah, essay, angket).
                      </p>
                    </div>
                    <Ikon nama="lanjut" className="h-4 w-4 shrink-0 text-tinta-2 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="overflow-x-auto border-t border-garis">
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
                              {stat.persenBenar === null ? (
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
                              {stat.persenBenar === null ? <span className="text-tinta-3">-</span> : stat.salah}
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
                </details>
              )}
            </div>
          )}
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
