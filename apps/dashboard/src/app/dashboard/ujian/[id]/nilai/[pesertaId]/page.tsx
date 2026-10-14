import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai, lulus, skorMaksSoal } from "@/lib/nilai";
import { ANGKET_PILIHAN } from "@/lib/bagian-ujian";
import { simpanSkorManual } from "@/actions/nilai";
import { BilahSimpan } from "@/components/ujian/bilah-simpan";
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
const ID_FORM = "form-koreksi";

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
  const kkm = rekap.ujian.kkm;

  // Kemajuan koreksi manual untuk siswa ini (benar/salah, essay, angket).
  const soalManual = rekap.listSoal.filter((soal) => soal.tipe !== "pg");
  const manualDijawab = soalManual.filter((soal) => peserta.listJawaban.some((jawaban) => jawaban.soalId === soal.soalId && jawaban.isi));
  const manualDinilai = manualDijawab.filter((soal) => {
    const jawaban = peserta.listJawaban.find((item) => item.soalId === soal.soalId);
    return jawaban?.skor !== null && jawaban?.skor !== undefined;
  });
  const persenKoreksi = manualDijawab.length > 0 ? Math.round((manualDinilai.length / manualDijawab.length) * 100) : 100;
  const nilaiLulus = lulus(peserta.nilai, kkm);

  const { error: errorQuery, sukses: pesanSukses } = await searchParams;
  const halamanRekap = `/dashboard/ujian/${ujianId}/nilai`;

  // Tombol pindah siswa juga menyimpan skor (server action), agar isian tidak hilang.
  const navigasiAtas = bisaDikoreksi ? (
    <>
      {pesertaSebelumnya && (
        <Tombol teks="Sebelumnya" nama="kembali_ke" nilai={pesertaSebelumnya.pesertaId} jenis="kedua" ukuran="kecil" ikon="kembali" teksProses="Menyimpan..." />
      )}
      {pesertaBerikutnya && (
        <Tombol teks="Berikutnya" nama="lanjut_ke" nilai={pesertaBerikutnya.pesertaId} jenis="kedua" ukuran="kecil" teksProses="Menyimpan..." />
      )}
    </>
  ) : (
    <>
      {pesertaSebelumnya && (
        <TautanTombol href={`${halamanRekap}/${pesertaSebelumnya.pesertaId}`} teks="Sebelumnya" jenis="kedua" ukuran="kecil" ikon="kembali" />
      )}
      {pesertaBerikutnya && <TautanTombol href={`${halamanRekap}/${pesertaBerikutnya.pesertaId}`} teks="Berikutnya" jenis="kedua" ukuran="kecil" />}
    </>
  );

  return (
    <form id={ID_FORM} action={simpanSkorManual} className="space-y-6">
      <input type="hidden" name="ujian_id" value={ujianId} />
      <input type="hidden" name="peserta_id" value={pesertaId} />

      <KepalaHalaman
        judul={peserta.nama}
        deskripsi={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {peserta.namaKelas}, no. absen {peserta.noAbsen ?? "-"}. Siswa {indeksPeserta + 1} dari {rekap.listBaris.length}.
            </span>
            {peserta.jumlahPelanggaran > 0 && <Lencana nada="merah">{peserta.jumlahPelanggaran} pelanggaran</Lencana>}
          </span>
        }
        kembali={{ href: halamanRekap, teks: `Rekap nilai ${rekap.ujian.judul}` }}
        aksi={navigasiAtas}
      />

      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
      {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-garis bg-garis sm:grid-cols-4">
        {[
          { teks: "PG otomatis", nilai: String(peserta.skorOtomatis), catatan: undefined, kelas: "" },
          {
            teks: "Skor manual",
            nilai: peserta.belumDinilai > 0 ? `${peserta.skorManual}*` : String(peserta.skorManual),
            catatan: undefined,
            kelas: "",
          },
          { teks: "Total skor", nilai: `${peserta.totalSkor}/${rekap.skorMaksimal}`, catatan: undefined, kelas: "" },
          {
            teks: "Nilai",
            nilai: String(peserta.nilai),
            catatan: peserta.belumDinilai > 0 ? "sementara" : nilaiLulus ? "Lulus" : "Belum lulus",
            kelas: peserta.belumDinilai > 0 ? "text-tinta-3" : nilaiLulus ? "text-hijau" : "text-merah",
          },
        ].map((item) => (
          <div key={item.teks} className="bg-permukaan px-5 py-4">
            <dt className="text-sm text-tinta-2">{item.teks}</dt>
            <dd className="angka mt-1 text-2xl font-bold text-tinta">{item.nilai}</dd>
            {item.catatan && <p className={`mt-0.5 text-xs font-semibold ${item.kelas}`}>{item.catatan}</p>}
          </div>
        ))}
      </dl>
      {peserta.belumDinilai > 0 && (
        <p className="-mt-3 text-xs text-tinta-2">* {peserta.belumDinilai} jawaban belum diberi skor. Nilai bertanda sementara.</p>
      )}

      {soalManual.length > 0 && (
        <section className="rounded-xl border border-garis bg-permukaan p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-tinta">
              Nilai manual: {manualDinilai.length} dari {manualDijawab.length} sudah diberi skor
            </span>
            <span className="angka font-semibold text-tinta-2">{persenKoreksi}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-kertas" role="presentation">
            <div className={`h-full rounded-full ${persenKoreksi >= 100 ? "bg-hijau" : "bg-kuning"}`} style={{ width: `${persenKoreksi}%` }} />
          </div>
        </section>
      )}

      {rekap.listSoal.map((soal, indeks) => {
        const detail = detailPerSoal.get(soal.soalId);
        const jawaban = peserta.listJawaban.find((item) => item.soalId === soal.soalId);
        const skorPenuh = jawaban?.skor !== null && jawaban?.skor !== undefined && jawaban.skor >= soal.bobot;
        const manual = soal.tipe !== "pg";
        const belumDinilai = manual && Boolean(jawaban) && (jawaban?.skor === null || jawaban?.skor === undefined);

        return (
          <Kartu key={soal.soalId} className={belumDinilai ? "ring-1 ring-kuning/30" : ""}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="angka text-sm font-bold text-tinta-3">{indeks + 1}.</span>
              <LencanaTipeSoal tipe={soal.tipe} />
              {soal.tipe === "pg"
                ? jawaban && jawaban.skor !== null && <Lencana nada={skorPenuh ? "hijau" : "merah"}>{skorPenuh ? "Benar" : "Salah"}</Lencana>
                : jawaban && <Lencana nada={belumDinilai ? "kuning" : "hijau"}>{belumDinilai ? "Belum dinilai" : "Sudah dinilai"}</Lencana>}
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

            {soal.tipe === "angket" && (
              <ul className="mb-4 space-y-1.5">
                {ANGKET_PILIHAN.map((pilihan) => {
                  const dipilihSiswa = jawaban?.isi === pilihan.nilai;
                  return (
                    <li
                      key={pilihan.nilai}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                        dipilihSiswa ? "border-nila/40 bg-nila-muda text-nila" : "border-garis text-tinta-2"
                      }`}
                    >
                      <span className="angka w-5 text-right font-bold">{pilihan.nilai}</span>
                      <span className="flex-1">{pilihan.teks}</span>
                      {dipilihSiswa && <span className="text-xs font-semibold">Dipilih siswa</span>}
                    </li>
                  );
                })}
              </ul>
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
              {manual && jawaban && bisaDikoreksi ? (
                <label className="flex items-center gap-2">
                  <span className="font-medium text-tinta">Skor</span>
                  <input
                    type="number"
                    name={`skor_${soal.soalId}`}
                    min={0}
                    max={soal.bobot}
                    step="any"
                    inputMode="decimal"
                    defaultValue={jawaban.skor ?? ""}
                    placeholder="-"
                    aria-label={`Skor soal nomor ${soal.urutan}, maksimal ${soal.bobot}`}
                    className="bidang angka w-20! text-right"
                  />
                  <span className="text-tinta-2">dari {soal.bobot}</span>
                </label>
              ) : (
                <span className="text-tinta-2">
                  Skor <strong className="angka text-tinta">{jawaban?.skor ?? 0}</strong> dari {skorMaksSoal(soal)}
                </span>
              )}
            </div>
          </Kartu>
        );
      })}

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

      {bisaDikoreksi && (manualDijawab.length > 0 || pesertaSebelumnya || pesertaBerikutnya) && (
        <BilahSimpan
          formId={ID_FORM}
          adaManual={manualDijawab.length > 0}
          lanjutKe={pesertaBerikutnya ? { id: pesertaBerikutnya.pesertaId, nama: pesertaBerikutnya.nama } : undefined}
          kembaliKe={pesertaSebelumnya?.pesertaId}
        />
      )}
    </form>
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
