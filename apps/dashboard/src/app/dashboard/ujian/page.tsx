import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteUjian } from "@/actions/ujian";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaStatusUjian } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Ujian" };

function aksiUtamaUjian(ujian: { id: string; status: string }) {
  if (ujian.status === "draft") return { href: `/dashboard/ujian/${ujian.id}/soal`, teks: "Atur soal" };
  if (ujian.status === "lobby" || ujian.status === "berjalan") return { href: `/dashboard/ujian/${ujian.id}/lobby`, teks: "Ruang kontrol" };
  return { href: `/dashboard/ujian/${ujian.id}/nilai`, teks: "Lihat nilai" };
}

const formatTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

async function DaftarUjian({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listUjian, error: errorList } = await supabase
    .from("ujian")
    .select("id, judul, mapel, durasi, status, created_at, ujian_soal(count)")
    .eq("guru_id", user.id)
    .order("created_at", { ascending: false });

  const { error: errorQuery } = await searchParams;

  return (
    <div className="space-y-4">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu tanpaPadding>
        {errorList ? (
          <div className="p-5">
            <Pesan jenis="error">{errorList.message}</Pesan>
          </div>
        ) : (listUjian ?? []).length === 0 ? (
          <KeadaanKosong
            ikon="ujian"
            judul="Belum ada ujian"
            deskripsi="Buat ujian, pilih soal dari bank soal, lalu buka lobby saat kelas siap."
            aksi={<TautanTombol href="/dashboard/ujian/buat" teks="Buat ujian" jenis="utama" ikon="tambah" />}
          />
        ) : (
          <ul className="divide-y divide-garis">
            {(listUjian ?? []).map((ujian) => {
              const aksi = aksiUtamaUjian(ujian);
              const jumlahSoal = (ujian.ujian_soal as { count: number }[])[0]?.count ?? 0;
              return (
                <li key={ujian.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={aksi.href} className="group min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-tinta group-hover:text-nila">{ujian.judul}</span>
                      <LencanaStatusUjian status={ujian.status} />
                    </span>
                    <span className="mt-0.5 block text-sm text-tinta-2">
                      {[ujian.mapel, `${jumlahSoal} soal`, `${ujian.durasi} menit`, formatTanggal.format(new Date(ujian.created_at))]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    {ujian.status === "draft" && (
                      <form action={deleteUjian}>
                        <input type="hidden" name="id" value={ujian.id} />
                        <TombolKonfirmasi
                          teks="Hapus"
                          jenis="hantu"
                          ukuran="kecil"
                          pesanKonfirmasi={`Hapus draft ujian "${ujian.judul}"?`}
                          className="hover:text-merah"
                        />
                      </form>
                    )}
                    <TautanTombol
                      href={aksi.href}
                      teks={aksi.teks}
                      jenis={ujian.status === "lobby" || ujian.status === "berjalan" ? "utama" : "kedua"}
                      ukuran="kecil"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Kartu>
    </div>
  );
}

export default function UjianPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <>
      <KepalaHalaman
        judul="Ujian"
        deskripsi="Alur ujian: draft, lobby dibuka, berjalan, selesai, lalu dinilai."
        aksi={<TautanTombol href="/dashboard/ujian/buat" teks="Buat ujian" jenis="utama" ikon="tambah" />}
      />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat ujian...</p>}>
        <DaftarUjian searchParams={searchParams} />
      </Suspense>
    </>
  );
}
