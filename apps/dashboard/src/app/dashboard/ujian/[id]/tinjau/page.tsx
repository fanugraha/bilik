import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateKode } from "@/actions/ujian";
import { susunLangkahUjian } from "@/lib/langkah-ujian";
import { namaMapel } from "@/lib/mapel";
import { PenandaLangkah } from "@/components/ujian/penanda-langkah";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Ikon } from "@/components/ui/ikon";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";

export const metadata: Metadata = { title: "Tinjau ujian" };

type ParamTinjau = Promise<{ error?: string }>;

const namaTipe: Record<string, string> = { pg: "pilihan ganda", benar_salah: "benar/salah", essay: "essay" };

function BarisRingkasan({ label, isi, hrefUbah }: { label: string; isi: ReactNode; hrefUbah: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-tinta-3">{label}</p>
        <div className="mt-0.5 text-sm text-tinta">{isi}</div>
      </div>
      <Link href={hrefUbah} className="shrink-0 text-sm font-semibold text-nila hover:underline">
        Ubah
      </Link>
    </div>
  );
}

async function LangkahTinjau({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamTinjau }) {
  await connection();
  const { id: ujianId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: ujian }, { data: listSoal }, { data: listKelas }, { count: jumlahBagian }] = await Promise.all([
    supabase
      .from("ujian")
      .select("id, judul, durasi, status, batas_pelanggaran, blokir_pelanggaran, acak_soal, acak_opsi, mapel_ref:mapel_id(nama)")
      .eq("id", ujianId)
      .eq("guru_id", user.id)
      .single(),
    supabase.from("ujian_soal").select("bobot, soal:soal_id(tipe)").eq("ujian_id", ujianId),
    supabase.from("ujian_kelas").select("kelas(nama, siswa(count))").eq("ujian_id", ujianId),
    supabase.from("ujian_section").select("id", { count: "exact", head: true }).eq("ujian_id", ujianId),
  ]);

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "draft") redirect(`/dashboard/ujian/${ujianId}/lobby`);

  const jumlahPerTipe = new Map<string, number>();
  let totalBobot = 0;
  for (const baris of listSoal ?? []) {
    totalBobot += Number(baris.bobot);
    const soal = (Array.isArray(baris.soal) ? baris.soal[0] : baris.soal) as { tipe: string } | null;
    if (soal) jumlahPerTipe.set(soal.tipe, (jumlahPerTipe.get(soal.tipe) ?? 0) + 1);
  }
  const jumlahSoal = listSoal?.length ?? 0;

  const daftarKelas = ((listKelas ?? []) as { kelas: { nama: string; siswa: { count: number }[] } | { nama: string; siswa: { count: number }[] }[] | null }[])
    .map((baris) => (Array.isArray(baris.kelas) ? baris.kelas[0] : baris.kelas))
    .filter((kelas): kelas is { nama: string; siswa: { count: number }[] } => Boolean(kelas));
  const jumlahSiswa = daftarKelas.reduce((total, kelas) => total + (kelas.siswa[0]?.count ?? 0), 0);

  const kondisi = { ujianId, jumlahSoal, jumlahKelas: daftarKelas.length };
  const { kekurangan, siapDibuka } = susunLangkahUjian(kondisi);
  const { error } = await searchParams;
  const dasar = `/dashboard/ujian/${ujianId}`;

  return (
    <>
      <KepalaHalaman judul={ujian.judul} deskripsi="Draft ujian" kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }} />
      <PenandaLangkah aktif="tinjau" kondisi={kondisi} />

      <div className="space-y-4">
        {error && <Pesan jenis="error">{error}</Pesan>}

        <Kartu judul="Ringkasan ujian" tanpaPadding>
          <div className="divide-y divide-garis">
            <BarisRingkasan
              label="Info"
              hrefUbah={`${dasar}/ubah`}
              isi={[namaMapel(ujian.mapel_ref), `${ujian.durasi} menit`].filter(Boolean).join(", ")}
            />
            <BarisRingkasan
              label="Soal"
              hrefUbah={`${dasar}/soal`}
              isi={
                jumlahSoal === 0 ? (
                  <span className="text-merah">Belum ada soal</span>
                ) : (
                  <>
                    {jumlahSoal} soal, total bobot {totalBobot}
                    <span className="block text-xs text-tinta-2">
                      {[...jumlahPerTipe].map(([tipe, jumlah]) => `${jumlah} ${namaTipe[tipe] ?? tipe}`).join(", ")}
                      {(jumlahBagian ?? 0) > 0 ? `; ${jumlahBagian} bagian` : ""}
                    </span>
                  </>
                )
              }
            />
            <BarisRingkasan
              label="Peserta"
              hrefUbah={`${dasar}/peserta`}
              isi={
                daftarKelas.length === 0 ? (
                  <span className="text-merah">Belum ada kelas peserta</span>
                ) : (
                  <>
                    {daftarKelas.map((kelas) => kelas.nama).join(", ")}
                    <span className="block text-xs text-tinta-2">{jumlahSiswa} siswa</span>
                  </>
                )
              }
            />
            <BarisRingkasan
              label="Aturan"
              hrefUbah={`${dasar}/peserta`}
              isi={[
                ujian.blokir_pelanggaran ? `Terkunci setelah ${ujian.batas_pelanggaran} pelanggaran` : "Blokir saat melanggar dimatikan",
                ujian.acak_soal ? "urutan soal diacak" : "urutan soal tetap",
                ujian.acak_opsi ? "pilihan jawaban diacak" : null,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </div>
        </Kartu>

        {siapDibuka ? (
          <section className="flex flex-col gap-4 rounded-xl border border-nila/20 bg-nila-muda px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-tinta">Ujian siap dibuka</p>
              <p className="text-sm text-tinta-2">Kode ujian dibuat saat lobby dibuka. Setelah itu soal dan pengaturan tidak bisa diubah.</p>
            </div>
            <form action={generateKode} className="shrink-0">
              <input type="hidden" name="ujian_id" value={ujianId} />
              <TombolKonfirmasi
                teks="Buka lobby"
                pesanKonfirmasi="Buka lobby sekarang? Kode ujian dibuat dan soal serta pengaturan tidak bisa diubah lagi."
              />
            </form>
          </section>
        ) : (
          <Kartu judul="Belum bisa dibuka">
            <ul className="space-y-2">
              {kekurangan.map((item) => (
                <li key={item.teks} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-tinta">
                    <Ikon nama="peringatan" className="h-4 w-4 text-kuning" />
                    {item.teks}
                  </span>
                  <TautanTombol href={item.href} teks="Lengkapi" ukuran="kecil" />
                </li>
              ))}
            </ul>
          </Kartu>
        )}

        <div className="border-t border-garis pt-5">
          <TautanTombol href={`${dasar}/peserta`} teks="Kembali: peserta & aturan" jenis="hantu" ikon="kembali" />
        </div>
      </div>
    </>
  );
}

export default function TinjauUjianPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParamTinjau }) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <LangkahTinjau params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
