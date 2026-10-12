import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";
import { simpanSkorEssay } from "@/actions/nilai";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

type ParamPesan = { error?: string; sukses?: string };

type DetailSoal = {
  id: string;
  opsi: string[] | null;
  kunci: string | null;
  jawaban_benar: boolean | null;
  pedoman: string | null;
};

const hurufOpsi = ["A", "B", "C", "D", "E"];

function formatWaktu(waktu: string) {
  return new Date(waktu).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" });
}

async function KoreksiPeserta({
  ujianId,
  pesertaId,
  searchParams,
}: {
  ujianId: string;
  pesertaId: string;
  searchParams: Promise<ParamPesan>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) redirect("/dashboard/ujian");

  const peserta = rekap.listBaris.find((baris) => baris.pesertaId === pesertaId);
  if (!peserta) redirect(`/dashboard/ujian/${ujianId}/nilai`);

  const { data: dataDetailSoal } = await supabase
    .from("soal")
    .select("id, opsi, kunci, jawaban_benar, pedoman")
    .in(
      "id",
      rekap.listSoal.map((soal) => soal.soalId),
    );

  const { data: listPelanggaran } = await supabase
    .from("pelanggaran")
    .select("id, jenis, waktu_server, keterangan")
    .eq("peserta_id", pesertaId)
    .order("waktu_server", { ascending: true });

  const detailPerSoal = new Map((dataDetailSoal as DetailSoal[] | null)?.map((soal) => [soal.id, soal]) ?? []);
  const bisaDikoreksi = rekap.ujian.status === "selesai" || rekap.ujian.status === "dinilai";
  const adaEssayDijawab = rekap.listSoal.some(
    (soal) => soal.tipe === "essay" && peserta.listJawaban.some((jawaban) => jawaban.soalId === soal.soalId),
  );

  const { error: errorQuery, sukses: pesanSukses } = await searchParams;

  return (
    <div className="space-y-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
      {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}

      <Kartu>
        <h2 className="text-lg font-semibold text-gray-900">{peserta.nama}</h2>
        <p className="text-sm text-gray-600">
          {peserta.namaKelas} · No. absen {peserta.noAbsen ?? "-"} · {rekap.ujian.judul}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-4">
          <div>PG & B/S: {peserta.skorOtomatis}</div>
          <div>Essay: {peserta.skorEssay}</div>
          <div>
            Total: {peserta.totalSkor}/{rekap.skorMaksimal}
          </div>
          <div className="font-semibold text-gray-900">Nilai: {peserta.nilai}</div>
        </div>
      </Kartu>

      <form action={simpanSkorEssay} className="space-y-4">
        <input type="hidden" name="ujian_id" value={ujianId} />
        <input type="hidden" name="peserta_id" value={pesertaId} />

        {rekap.listSoal.map((soal, indeks) => {
          const detail = detailPerSoal.get(soal.soalId);
          const jawaban = peserta.listJawaban.find((item) => item.soalId === soal.soalId);

          return (
            <Kartu key={soal.soalId}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">
                  {indeks + 1}. {soal.teks}
                </p>
                <span className="shrink-0 text-xs text-gray-500">Bobot {soal.bobot}</span>
              </div>

              {soal.tipe === "pg" && (
                <ul className="mb-3 space-y-1 text-sm">
                  {(detail?.opsi ?? []).map((teksOpsi, urutanOpsi) => {
                    const huruf = hurufOpsi[urutanOpsi];
                    const adalahKunci = huruf === detail?.kunci;
                    const dipilihSiswa = huruf === jawaban?.isi?.trim().toUpperCase();
                    let warna = "text-gray-700";
                    if (adalahKunci) warna = "font-semibold text-green-700";
                    else if (dipilihSiswa) warna = "text-red-700";
                    return (
                      <li key={huruf} className={warna}>
                        {huruf}. {teksOpsi}
                        {adalahKunci && " (kunci)"}
                        {dipilihSiswa && " ← jawaban siswa"}
                      </li>
                    );
                  })}
                </ul>
              )}

              {soal.tipe === "benar_salah" && (
                <p className="mb-3 text-sm text-gray-700">
                  Kunci: <strong>{detail?.jawaban_benar ? "Benar" : "Salah"}</strong> · Jawaban siswa:{" "}
                  <strong>{jawaban?.isi ?? "-"}</strong>
                </p>
              )}

              {soal.tipe === "essay" && (
                <div className="mb-3 space-y-2 text-sm">
                  <div className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-gray-900">
                    {jawaban?.isi || <span className="italic text-gray-400">Tidak dijawab</span>}
                  </div>
                  {detail?.pedoman && (
                    <div className="rounded border border-indigo-100 bg-indigo-50 p-3 text-indigo-900">
                      <span className="text-xs font-semibold uppercase">Pedoman</span>
                      <p className="whitespace-pre-wrap">{detail.pedoman}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 text-sm">
                {soal.tipe === "essay" && jawaban && bisaDikoreksi ? (
                  <label className="flex items-center gap-2">
                    <span className="text-gray-700">Skor</span>
                    <input
                      type="number"
                      name={`skor_${soal.soalId}`}
                      min={0}
                      max={soal.bobot}
                      step="any"
                      defaultValue={jawaban.skor ?? ""}
                      placeholder="-"
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-500">/ {soal.bobot}</span>
                  </label>
                ) : (
                  <span className="text-gray-700">
                    Skor: <strong>{jawaban?.skor ?? (jawaban ? "-" : 0)}</strong> / {soal.bobot}
                  </span>
                )}
              </div>
            </Kartu>
          );
        })}

        {adaEssayDijawab && bisaDikoreksi && (
          <div className="flex justify-end">
            <Tombol teks="Simpan Skor Essay" jenis="utama" className="w-full sm:w-auto" />
          </div>
        )}
      </form>

      <Kartu>
        <h3 className="mb-3 text-base font-semibold text-gray-900">
          Log Pelanggaran ({listPelanggaran?.length ?? 0})
        </h3>
        {!listPelanggaran || listPelanggaran.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada pelanggaran tercatat.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {listPelanggaran.map((pelanggaran) => (
              <li key={pelanggaran.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between">
                <span className="font-medium text-red-700">{pelanggaran.jenis}</span>
                {pelanggaran.keterangan && <span className="text-gray-600">{pelanggaran.keterangan}</span>}
                <span className="text-gray-500">{formatWaktu(pelanggaran.waktu_server)}</span>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  );
}

export default function KoreksiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pesertaId: string }>;
  searchParams: Promise<ParamPesan>;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Suspense fallback={<p className="text-gray-500">Memuat jawaban...</p>}>
        <HalamanKoreksi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HalamanKoreksi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pesertaId: string }>;
  searchParams: Promise<ParamPesan>;
}) {
  const { id, pesertaId } = await params;
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Koreksi Jawaban</h1>
        <Link href={`/dashboard/ujian/${id}/nilai`} className="text-sm text-indigo-600 hover:underline">
          ← Kembali ke Rekap
        </Link>
      </div>
      <KoreksiPeserta ujianId={id} pesertaId={pesertaId} searchParams={searchParams} />
    </>
  );
}
