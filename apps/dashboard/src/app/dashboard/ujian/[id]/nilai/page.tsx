import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";
import { hitungNilaiOtomatis, tandaiDinilai } from "@/actions/nilai";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

type ParamPesan = { error?: string; sukses?: string };

async function RekapNilai({ ujianId, searchParams }: { ujianId: string; searchParams: Promise<ParamPesan> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) redirect("/dashboard/ujian");

  const { ujian, listSoal, skorMaksimal, listBaris } = rekap;
  const { error: errorQuery, sukses: pesanSukses } = await searchParams;

  if (ujian.status !== "selesai" && ujian.status !== "dinilai") {
    return (
      <Pesan jenis="info">
        Ujian masih berstatus <strong>{ujian.status}</strong>. Nilai bisa dilihat setelah ujian diakhiri dari{" "}
        <Link href={`/dashboard/ujian/${ujianId}/lobby`} className="underline">
          ruang kontrol
        </Link>
        .
      </Pesan>
    );
  }

  let jumlahEssayBelumDikoreksi = 0;
  let jumlahNilai = 0;
  for (const baris of listBaris) {
    jumlahEssayBelumDikoreksi += baris.essayBelumDikoreksi;
    jumlahNilai += baris.nilai;
  }
  const rataRata = listBaris.length > 0 ? Math.round((jumlahNilai / listBaris.length) * 10) / 10 : 0;
  const adaEssay = listSoal.some((soal) => soal.tipe === "essay");

  return (
    <div className="space-y-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
      {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}

      <Kartu>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{ujian.judul}</h2>
            {ujian.mapel && <p className="text-sm text-gray-600">{ujian.mapel}</p>}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-4">
              <div>Peserta: {listBaris.length}</div>
              <div>Soal: {listSoal.length}</div>
              <div>Skor maks: {skorMaksimal}</div>
              <div>Rata-rata: {rataRata}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form action={hitungNilaiOtomatis}>
              <input type="hidden" name="ujian_id" value={ujianId} />
              <Tombol teks="Hitung Ulang PG & B/S" jenis="kedua" className="w-full sm:w-auto" />
            </form>
            <a
              href={`/dashboard/ujian/${ujianId}/nilai/ekspor`}
              className="rounded-lg bg-gray-200 px-4 py-2.5 text-center font-medium text-gray-900 transition-colors hover:bg-gray-300"
            >
              Ekspor Excel (CSV)
            </a>
          </div>
        </div>

        {ujian.status === "selesai" && (
          <div className="mt-4 border-t pt-4">
            {adaEssay && jumlahEssayBelumDikoreksi > 0 ? (
              <p className="text-sm text-amber-700">
                {jumlahEssayBelumDikoreksi} jawaban essay belum dikoreksi. Klik nama siswa untuk mengoreksi.
              </p>
            ) : (
              <form action={tandaiDinilai}>
                <input type="hidden" name="ujian_id" value={ujianId} />
                <Tombol teks="Tandai Selesai Dinilai" jenis="utama" className="w-full sm:w-auto" />
              </form>
            )}
          </div>
        )}
        {ujian.status === "dinilai" && (
          <p className="mt-4 border-t pt-4 text-sm text-purple-700">Ujian ini sudah ditandai selesai dinilai.</p>
        )}
      </Kartu>

      <Kartu>
        <h3 className="mb-4 text-base font-semibold text-gray-900">Rekap Nilai</h3>
        {listBaris.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada peserta di ujian ini.</p>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Kelas</th>
                  <th className="py-2 pr-3">No</th>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3 text-right">PG & B/S</th>
                  {adaEssay && <th className="py-2 pr-3 text-right">Essay</th>}
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">Nilai</th>
                  <th className="py-2 text-right">Pelanggaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listBaris.map((baris) => (
                  <tr key={baris.pesertaId} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-600">{baris.namaKelas}</td>
                    <td className="py-2 pr-3 text-gray-600">{baris.noAbsen ?? "-"}</td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/dashboard/ujian/${ujianId}/nilai/${baris.pesertaId}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {baris.nama}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right">{baris.skorOtomatis}</td>
                    {adaEssay && (
                      <td className="py-2 pr-3 text-right">
                        {baris.skorEssay}
                        {baris.essayBelumDikoreksi > 0 && (
                          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                            {baris.essayBelumDikoreksi} belum
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-2 pr-3 text-right">
                      {baris.totalSkor}/{skorMaksimal}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-gray-900">{baris.nilai}</td>
                    <td className="py-2 text-right">
                      {baris.jumlahPelanggaran > 0 ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          {baris.jumlahPelanggaran}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
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
  );
}

export default function NilaiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamPesan>;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Penilaian Ujian</h1>
        <Link href="/dashboard/ujian" className="text-sm text-indigo-600 hover:underline">
          ← Kembali ke Ujian
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat nilai...</p>}>
        <HalamanNilai params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HalamanNilai({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamPesan>;
}) {
  const { id } = await params;
  return <RekapNilai ujianId={id} searchParams={searchParams} />;
}
