import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tambahSoalUjian, hapusSoalUjian, generateKode } from "@/actions/ujian";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function AturSoalUjian({
  ujianId,
  searchParams,
}: {
  ujianId: string;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, durasi, acak_soal, acak_opsi, batas_pelanggaran, status")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");

  const { data: soalUjian } = await supabase
    .from("ujian_soal")
    .select("ujian_id, soal_id, urutan, bobot")
    .eq("ujian_id", ujianId)
    .order("urutan", { ascending: true });

  const { data: allSoal } = await supabase
    .from("soal")
    .select("id, tipe, teks, bobot")
    .eq("guru_id", user.id)
    .order("created_at", { ascending: false });

  const soalUjianIds = (soalUjian || []).map((su) => su.soal_id);
  const soalTersedia = (allSoal || []).filter((s) => !soalUjianIds.includes(s.id));

  const { error: errorQuery } = await searchParams;

  const typeLabel = (tipe: string) => {
    switch (tipe) {
      case "pg":
        return "PG";
      case "essay":
        return "Essay";
      case "benar_salah":
        return "B/S";
      default:
        return tipe;
    }
  };

  return (
    <div className="space-y-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">{ujian.judul}</h3>
          {ujian.status === "draft" && (
            <Link href={`/dashboard/ujian/${ujianId}/ubah`} className="text-sm text-indigo-600 hover:underline">
              Ubah pengaturan
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
          <div>Durasi: {ujian.durasi} menit</div>
          <div>Acak Soal: {ujian.acak_soal ? "Ya" : "Tidak"}</div>
          <div>Acak Opsi: {ujian.acak_opsi ? "Ya" : "Tidak"}</div>
          <div>Batas Pelanggaran: {ujian.batas_pelanggaran}</div>
        </div>
      </Kartu>

      {soalUjian && soalUjian.length > 0 ? (
        <Kartu>
          <h4 className="mb-4 text-base font-semibold text-gray-900">Soal Terpilih ({soalUjian.length})</h4>
          <div className="space-y-2">
            {soalUjian.map((su, idx) => {
              const soal = allSoal?.find((s) => s.id === su.soal_id);
              return (
                <div
                  key={su.soal_id}
                  className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {idx + 1}. {soal?.teks.substring(0, 50)}... <span className="text-xs text-gray-600">({typeLabel(soal?.tipe || "")})</span>
                    </div>
                  </div>
                  <form>
                    <input type="hidden" name="ujian_id" value={ujianId} />
                    <input type="hidden" name="soal_id" value={su.soal_id} />
                    <Tombol teks="Hapus" jenis="bahaya" formAction={hapusSoalUjian} />
                  </form>
                </div>
              );
            })}
          </div>
        </Kartu>
      ) : (
        <Pesan jenis="info">Belum ada soal. Tambahkan soal di bawah.</Pesan>
      )}

      {soalTersedia.length > 0 && (
        <Kartu>
          <h4 className="mb-4 text-base font-semibold text-gray-900">Tambah Soal dari Bank ({soalTersedia.length})</h4>
          <form action={tambahSoalUjian} className="space-y-4">
            <input type="hidden" name="ujian_id" value={ujianId} />
            <div className="space-y-2">
              {soalTersedia.map((soal) => (
                <label key={soal.id} className="flex items-center gap-2 cursor-pointer rounded border border-gray-200 p-2 hover:bg-gray-50">
                  <input type="checkbox" name="soal_ids[]" value={soal.id} className="w-4 h-4" />
                  <div className="flex-1 text-sm text-gray-900">{soal.teks.substring(0, 60)}...</div>
                  <span className="text-xs text-gray-600">{typeLabel(soal.tipe)}</span>
                </label>
              ))}
            </div>
            <Tombol teks="Tambah Soal Pilihan" jenis="utama" />
          </form>
        </Kartu>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Link href="/dashboard/ujian" className="flex-1">
          <Tombol teks="Batal" jenis="kedua" className="w-full" />
        </Link>
        {ujian.status === "draft" && soalUjian && soalUjian.length > 0 && (
          <form className="flex-1">
            <input type="hidden" name="ujian_id" value={ujianId} />
            <Tombol teks="Generate Kode & Buka Lobby" jenis="utama" formAction={generateKode} className="w-full" />
          </form>
        )}
      </div>
    </div>
  );
}

export default function AturSoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
      <HalamanAturSoal params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanAturSoal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Atur Soal Ujian</h1>
        <Link href="/dashboard/ujian" className="text-sm text-indigo-600 hover:underline">
          ← Kembali
        </Link>
      </div>
      <AturSoalUjian ujianId={id} searchParams={searchParams} />
    </main>
  );
}
