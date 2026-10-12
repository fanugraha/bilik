import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setujuiPeserta, mulaiUjian, akhiriUjian, beriKodeBuka } from "@/actions/kontrol";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { PemantauRealtime } from "@/components/pemantau-realtime";

interface DataSiswa {
  nama: string;
  no_absen: number | null;
}

interface PesertaItem {
  id: string;
  status: string;
  disetujui: boolean;
  jumlah_pelanggaran: number;
  siswa: DataSiswa | DataSiswa[];
}

async function RuangKontrol({
  ujianId,
  searchParams,
}: {
  ujianId: string;
  searchParams: Promise<{ error?: string; kode_buka?: string; nama?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, kode, durasi, status, mulai_at, selesai_at")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");

  const { data: listPeserta } = await supabase
    .from("peserta")
    .select(`
      id,
      status,
      disetujui,
      jumlah_pelanggaran,
      siswa:siswa_id (
        nama,
        no_absen
      )
    `)
    .eq("ujian_id", ujianId)
    .order("created_at", { ascending: true });

  const listPesertaId = (listPeserta ?? []).map((peserta) => peserta.id);

  const { count: jumlahSoal } = await supabase
    .from("ujian_soal")
    .select("soal_id", { count: "exact", head: true })
    .eq("ujian_id", ujianId);

  const { data: listJawabanTerisi } = listPesertaId.length
    ? await supabase.from("jawaban").select("peserta_id").in("peserta_id", listPesertaId).not("isi", "is", null)
    : { data: [] };

  const jumlahTerjawabPerPeserta = new Map<string, number>();
  for (const jawaban of listJawabanTerisi ?? []) {
    const jumlahSebelumnya = jumlahTerjawabPerPeserta.get(jawaban.peserta_id) ?? 0;
    jumlahTerjawabPerPeserta.set(jawaban.peserta_id, jumlahSebelumnya + 1);
  }

  let jumlahDisetujui = 0;
  for (const peserta of listPeserta ?? []) {
    if (peserta.disetujui) jumlahDisetujui++;
  }

  const { error: errorQuery, kode_buka: kodeBuka, nama: namaKodeBuka } = await searchParams;

  const statusPesertaBadge = (status: string) => {
    switch (status) {
      case "menunggu":
        return "bg-yellow-100 text-yellow-800";
      case "mengerjakan":
        return "bg-green-100 text-green-800";
      case "terkunci":
        return "bg-red-100 text-red-800";
      case "selesai":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      {kodeBuka && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Kode Buka{namaKodeBuka ? ` untuk ${namaKodeBuka}` : ""}
          </span>
          <div className="mt-1 text-4xl font-black tracking-widest text-red-900">{kodeBuka}</div>
          <p className="mt-1 text-xs text-red-700">Sekali pakai, berlaku 5 menit. Sampaikan langsung ke siswa.</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Kode Ujian</span>
          <div className="text-4xl md:text-5xl font-black tracking-widest text-indigo-900 mt-1">
            {ujian.kode || "------"}
          </div>
          <p className="text-xs text-indigo-700 mt-1">Siswa memasukkan kode ini di aplikasi mobile untuk bergabung.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {ujian.status === "lobby" && (
            <form action={mulaiUjian}>
              <input type="hidden" name="ujian_id" value={ujianId} />
              <TombolKonfirmasi
                teks="Mulai Ujian Sekarang"
                pesanKonfirmasi={`Mulai ujian untuk ${jumlahDisetujui} siswa yang sudah disetujui? Siswa yang belum disetujui tidak ikut.`}
                jenis="utama"
                className="w-full sm:w-auto text-base py-3 px-6"
              />
            </form>
          )}
          {(ujian.status === "selesai" || ujian.status === "dinilai") && (
            <Link
              href={`/dashboard/ujian/${ujianId}/nilai`}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-center text-base font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Lihat Nilai
            </Link>
          )}
          {ujian.status === "berjalan" && (
            <form action={akhiriUjian}>
              <input type="hidden" name="ujian_id" value={ujianId} />
              <TombolKonfirmasi
                teks="Akhiri Ujian"
                pesanKonfirmasi="Akhiri ujian untuk semua siswa sekarang? Jawaban dikunci dan tidak bisa diubah lagi."
                jenis="bahaya"
                className="w-full sm:w-auto text-base py-3 px-6"
              />
            </form>
          )}
        </div>
      </div>

      <Kartu>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Daftar Peserta ({listPeserta?.length || 0})
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">Status Ujian: <strong className="capitalize">{ujian.status}</strong></span>
            {(ujian.status === "lobby" || ujian.status === "berjalan") && (
              <PemantauRealtime ujianId={ujianId} listPesertaId={listPesertaId} />
            )}
          </div>
        </div>

        {listPeserta?.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Belum ada siswa yang bergabung ke lobby.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(listPeserta as PesertaItem[])?.map((p) => {
              const siswaData = Array.isArray(p.siswa) ? p.siswa[0] : p.siswa;
              return (
              <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-sm font-semibold text-gray-500">
                    {siswaData?.no_absen || "-"}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{siswaData?.nama}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPesertaBadge(p.status)}`}>
                        {p.status}
                      </span>
                      {ujian.status !== "lobby" && (
                        <span className="text-xs text-gray-500">
                          {jumlahTerjawabPerPeserta.get(p.id) ?? 0}/{jumlahSoal ?? 0} terjawab
                        </span>
                      )}
                      {p.jumlah_pelanggaran > 0 && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          {p.jumlah_pelanggaran} pelanggaran
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ujian.status === "lobby" && (
                    <form action={setujuiPeserta} className="flex gap-2">
                      <input type="hidden" name="ujian_id" value={ujianId} />
                      <input type="hidden" name="peserta_id" value={p.id} />
                      <input type="hidden" name="setujui" value={p.disetujui ? "false" : "true"} />
                      <Tombol
                        teks={p.disetujui ? "Batalkan" : "Setujui"}
                        jenis={p.disetujui ? "kedua" : "utama"}
                        className="text-xs py-1.5 px-3"
                      />
                    </form>
                  )}

                  {p.status === "terkunci" && (
                    <form action={beriKodeBuka}>
                      <input type="hidden" name="ujian_id" value={ujianId} />
                      <input type="hidden" name="peserta_id" value={p.id} />
                      <Tombol teks="Beri Kode Buka" jenis="bahaya" className="text-xs py-1.5 px-3" />
                    </form>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </Kartu>
    </div>
  );
}

export default function LobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; kode_buka?: string; nama?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-gray-500">Memuat ruang kontrol...</p>}>
      <HalamanLobby params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanLobby({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; kode_buka?: string; nama?: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ruang Kontrol Ujian</h1>
        <Link href="/dashboard/ujian" className="text-sm text-indigo-600 hover:underline">
          ← Kembali ke Ujian
        </Link>
      </div>
      <RuangKontrol ujianId={id} searchParams={searchParams} />
    </main>
  );
}
