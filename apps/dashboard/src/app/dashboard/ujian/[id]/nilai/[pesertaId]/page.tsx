import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";
import { simpanSkorEssay } from "@/actions/nilai";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Ikon } from "@/components/ui/ikon";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { Lencana, LencanaTipeSoal } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Koreksi jawaban" };

type ParamPesan = { error?: string; sukses?: string };

type DetailSoal = {
  id: string;
  opsi: string[] | null;
  kunci: string | null;
  jawaban_benar: boolean | null;
  pedoman: string | null;
};

const hurufOpsi = ["A", "B", "C", "D", "E"];
const formatWaktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium" });

async function KoreksiPeserta({ ujianId, pesertaId, searchParams }: { ujianId: string; pesertaId: string; searchParams: Promise<ParamPesan> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) redirect("/dashboard/ujian");

  const indeksPeserta = rekap.listBaris.findIndex((baris) => baris.pesertaId === pesertaId);
  if (indeksPeserta === -1) redirect(`/dashboard/ujian/${ujianId}/nilai`);
  const peserta = rekap.listBaris[indeksPeserta];
  const pesertaSebelumnya = rekap.listBaris[indeksPeserta - 1];
  const pesertaBerikutnya = rekap.listBaris[indeksPeserta + 1];

  const [{ data: dataDetailSoal }, { data: listPelanggaran }] = await Promise.all([
    supabase
      .from("soal")
      .select("id, opsi, kunci, jawaban_benar, pedoman")
      .in(
        "id",
        rekap.listSoal.map((soal) => soal.soalId),
      ),
    supabase.from("pelanggaran").select("id, jenis, waktu_server, keterangan").eq("peserta_id", pesertaId).order("waktu_server", { ascending: true }),
  ]);

  const detailPerSoal = new Map(((dataDetailSoal ?? []) as DetailSoal[]).map((soal) => [soal.id, soal]));
  const bisaDikoreksi = rekap.ujian.status === "selesai" || rekap.ujian.status === "dinilai";
  const adaEssayDijawab = rekap.listSoal.some(
    (soal) => soal.tipe === "essay" && peserta.listJawaban.some((jawaban) => jawaban.soalId === soal.soalId),
  );

  const { error: errorQuery, sukses: pesanSukses } = await searchParams;
  const halamanRekap = `/dashboard/ujian/${ujianId}/nilai`;

  return (
    <>
      <KepalaHalaman
        judul={peserta.nama}
        deskripsi={`${peserta.namaKelas}, no. absen ${peserta.noAbsen ?? "-"}. Siswa ${indeksPeserta + 1} dari ${rekap.listBaris.length}.`}
        kembali={{ href: halamanRekap, teks: `Rekap nilai ${rekap.ujian.judul}` }}
        aksi={
          <>
            {pesertaSebelumnya && (
              <TautanTombol href={`${halamanRekap}/${pesertaSebelumnya.pesertaId}`} teks="Sebelumnya" jenis="kedua" ukuran="kecil" ikon="kembali" />
            )}
            {pesertaBerikutnya && (
              <TautanTombol href={`${halamanRekap}/${pesertaBerikutnya.pesertaId}`} teks="Berikutnya" jenis="kedua" ukuran="kecil" />
            )}
          </>
        }
      />

      <div className="space-y-6">
        {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
        {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-garis bg-garis sm:grid-cols-4">
          {[
            { teks: "PG & B/S", nilai: peserta.skorOtomatis },
            { teks: "Essay", nilai: peserta.essayBelumDikoreksi > 0 ? `${peserta.skorEssay}*` : peserta.skorEssay },
            { teks: "Total", nilai: `${peserta.totalSkor}/${rekap.skorMaksimal}` },
            { teks: "Nilai", nilai: peserta.nilai },
          ].map((item) => (
            <div key={item.teks} className="bg-permukaan px-5 py-4">
              <dt className="text-sm text-tinta-2">{item.teks}</dt>
              <dd className="angka mt-1 text-2xl font-bold text-tinta">{item.nilai}</dd>
            </div>
          ))}
        </dl>
        {peserta.essayBelumDikoreksi > 0 && (
          <p className="-mt-3 text-xs text-tinta-2">* {peserta.essayBelumDikoreksi} jawaban essay belum diberi skor.</p>
        )}

        <form action={simpanSkorEssay} className="space-y-4">
          <input type="hidden" name="ujian_id" value={ujianId} />
          <input type="hidden" name="peserta_id" value={pesertaId} />

          {rekap.listSoal.map((soal, indeks) => {
            const detail = detailPerSoal.get(soal.soalId);
            const jawaban = peserta.listJawaban.find((item) => item.soalId === soal.soalId);
            const skorPenuh = jawaban?.skor !== null && jawaban?.skor !== undefined && jawaban.skor >= soal.bobot;

            return (
              <Kartu key={soal.soalId}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="angka text-sm font-bold text-tinta-3">{indeks + 1}.</span>
                  <LencanaTipeSoal tipe={soal.tipe} />
                  {soal.tipe !== "essay" && jawaban && jawaban.skor !== null && (
                    <Lencana nada={skorPenuh ? "hijau" : "merah"}>{skorPenuh ? "Benar" : "Salah"}</Lencana>
                  )}
                  {!jawaban && <Lencana nada="abu">Tidak dijawab</Lencana>}
                </div>
                <p className="mb-4 whitespace-pre-wrap text-sm text-tinta">{soal.teks}</p>

                {soal.tipe === "pg" && (
                  <ul className="mb-4 space-y-1.5">
                    {(detail?.opsi ?? []).map((teksOpsi, urutanOpsi) => {
                      const huruf = hurufOpsi[urutanOpsi];
                      const adalahKunci = huruf === detail?.kunci;
                      const dipilihSiswa = huruf === jawaban?.isi?.trim().toUpperCase();
                      let gaya = "border-garis text-tinta-2";
                      if (adalahKunci) gaya = "border-hijau/40 bg-hijau-muda text-hijau";
                      else if (dipilihSiswa) gaya = "border-merah/30 bg-merah-muda text-merah";
                      return (
                        <li key={huruf} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${gaya}`}>
                          <span className="font-bold">{huruf}</span>
                          <span className="flex-1">{teksOpsi}</span>
                          {adalahKunci && <span className="text-xs font-semibold">Kunci</span>}
                          {dipilihSiswa && <span className="text-xs font-semibold">{adalahKunci ? "Dipilih siswa" : "Pilihan siswa"}</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {soal.tipe === "benar_salah" && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-tinta-2">
                      Kunci <strong className="text-tinta">{detail?.jawaban_benar ? "Benar" : "Salah"}</strong>, siswa menjawab{" "}
                      <strong className="text-tinta">{jawaban?.isi ?? "-"}</strong>.
                    </p>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-tinta-2">Alasan siswa</p>
                      <div className="min-h-14 whitespace-pre-wrap rounded-lg border border-garis bg-kertas p-3 text-sm text-tinta">
                        {jawaban?.alasan || <span className="italic text-tinta-3">Tidak diisi</span>}
                      </div>
                    </div>
                  </div>
                )}

                {soal.tipe === "essay" && (
                  <div className="mb-4 grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-tinta-2">Jawaban siswa</p>
                      <div className="min-h-20 whitespace-pre-wrap rounded-lg border border-garis bg-kertas p-3 text-sm text-tinta">
                        {jawaban?.isi || <span className="italic text-tinta-3">Tidak dijawab</span>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-tinta-2">Pedoman penilaian</p>
                      <div className="min-h-20 whitespace-pre-wrap rounded-lg border border-nila/15 bg-nila-muda p-3 text-sm text-tinta">
                        {detail?.pedoman || <span className="italic text-tinta-3">Tidak ada pedoman</span>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-garis pt-3 text-sm">
                  {soal.tipe === "essay" && jawaban && bisaDikoreksi ? (
                    <label className="flex items-center gap-2">
                      <span className="font-medium text-tinta">Skor</span>
                      <input
                        type="number"
                        name={`skor_${soal.soalId}`}
                        min={0}
                        max={soal.bobot}
                        step="any"
                        defaultValue={jawaban.skor ?? ""}
                        placeholder="-"
                        className="bidang angka w-20! text-right"
                      />
                      <span className="text-tinta-2">dari {soal.bobot}</span>
                    </label>
                  ) : (
                    <span className="text-tinta-2">
                      Skor <strong className="angka text-tinta">{jawaban?.skor ?? 0}</strong> dari {soal.bobot}
                    </span>
                  )}
                </div>
              </Kartu>
            );
          })}

          {adaEssayDijawab && bisaDikoreksi && (
            <div className="sticky bottom-4 flex flex-wrap justify-end gap-2 rounded-xl border border-garis bg-permukaan/95 p-3 shadow-lg backdrop-blur">
              <Tombol teks="Simpan skor" jenis={pesertaBerikutnya ? "kedua" : "utama"} teksProses="Menyimpan..." />
              {pesertaBerikutnya && (
                <Tombol
                  teks={`Simpan & lanjut ke ${pesertaBerikutnya.nama}`}
                  nama="lanjut_ke"
                  nilai={pesertaBerikutnya.pesertaId}
                  teksProses="Menyimpan..."
                />
              )}
            </div>
          )}
        </form>

        <Kartu judul="Log pelanggaran" deskripsi={`${listPelanggaran?.length ?? 0} kejadian tercatat`} tanpaPadding>
          {!listPelanggaran || listPelanggaran.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-4 text-sm text-tinta-2">
              <Ikon nama="centang" className="h-4 w-4 text-hijau" />
              Tidak ada pelanggaran.
            </p>
          ) : (
            <ol className="divide-y divide-garis">
              {listPelanggaran.map((pelanggaran) => (
                <li key={pelanggaran.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="font-semibold text-merah">{pelanggaran.jenis}</span>
                    {pelanggaran.keterangan && <span className="ml-2 text-tinta-2">{pelanggaran.keterangan}</span>}
                  </span>
                  <span className="angka text-xs text-tinta-2">{formatWaktu.format(new Date(pelanggaran.waktu_server))}</span>
                </li>
              ))}
            </ol>
          )}
        </Kartu>
      </div>
    </>
  );
}

export default function KoreksiPage({ params, searchParams }: { params: Promise<{ id: string; pesertaId: string }>; searchParams: Promise<ParamPesan> }) {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat jawaban...</p>}>
        <HalamanKoreksi params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HalamanKoreksi({ params, searchParams }: { params: Promise<{ id: string; pesertaId: string }>; searchParams: Promise<ParamPesan> }) {
  const { id, pesertaId } = await params;
  return <KoreksiPeserta ujianId={id} pesertaId={pesertaId} searchParams={searchParams} />;
}
