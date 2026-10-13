import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { namaMapel } from "@/lib/mapel";
import { deleteUjian } from "@/actions/ujian";
import { ambilAksiAlur } from "@/lib/alur";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaStatusUjian, teksStatusUjian } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Ujian" };

function aksiUtamaUjian(ujian: { id: string; status: string }) {
  if (ujian.status === "draft") return { href: `/dashboard/ujian/${ujian.id}/soal`, teks: "Lanjutkan menyiapkan" };
  if (ujian.status === "lobby" || ujian.status === "berjalan") return { href: `/dashboard/ujian/${ujian.id}/lobby`, teks: "Ruang kontrol" };
  return { href: `/dashboard/ujian/${ujian.id}/nilai`, teks: "Lihat nilai" };
}

const formatTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

async function IsiUjian({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: listUjian, error: errorList }, { error: errorQuery, status = "" }, aksiLanjut] = await Promise.all([
    supabase
      .from("ujian")
      .select("id, judul, durasi, status, created_at, mapel_ref:mapel_id(nama), ujian_soal(count)")
      .eq("guru_id", user.id)
      .order("created_at", { ascending: false }),
    searchParams,
    ambilAksiAlur(supabase),
  ]);

  const semuaUjian = listUjian ?? [];

  // Saat data masih awal, ajakan mengikuti langkah terdekat agar tidak langsung "Buat ujian"
  const aksiBuat = aksiLanjut
    ? { href: aksiLanjut.href, teks: aksiLanjut.judul }
    : { href: "/dashboard/ujian/buat", teks: "Buat ujian" };

  const urutanStatus = ["draft", "lobby", "berjalan", "selesai", "dinilai"];
  const jumlahStatus = new Map<string, number>();
  for (const ujian of semuaUjian) jumlahStatus.set(ujian.status, (jumlahStatus.get(ujian.status) ?? 0) + 1);
  const daftarFilter = [
    { nilai: "", teks: "Semua", jumlah: semuaUjian.length },
    ...urutanStatus.filter((s) => (jumlahStatus.get(s) ?? 0) > 0).map((s) => ({ nilai: s, teks: teksStatusUjian(s), jumlah: jumlahStatus.get(s) ?? 0 })),
  ];
  const listTampil = status ? semuaUjian.filter((ujian) => ujian.status === status) : semuaUjian;
  const hrefStatus = (nilai: string) => `/dashboard/ujian${nilai ? `?status=${nilai}` : ""}`;

  return (
    <>
      <KepalaHalaman
        judul="Ujian"
        deskripsi="Alur ujian: draft, lobby dibuka, berjalan, selesai, lalu dinilai."
        aksi={<TautanTombol href={aksiBuat.href} teks={aksiBuat.teks} jenis="utama" ikon="tambah" />}
      />

      <div className="space-y-4">
        {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

        <Kartu tanpaPadding>
          {errorList ? (
            <div className="p-5">
              <Pesan jenis="error">{errorList.message}</Pesan>
            </div>
          ) : semuaUjian.length === 0 ? (
            <KeadaanKosong
              ikon="ujian"
              judul="Belum ada ujian"
              deskripsi="Buat ujian, pilih soal dari bank soal, lalu buka lobby saat kelas siap."
              aksi={<TautanTombol href={aksiBuat.href} teks={aksiBuat.teks} jenis="utama" ikon="tambah" />}
            />
          ) : (
            <>
              <nav aria-label="Saring status ujian" className="flex gap-1 overflow-x-auto border-b border-garis px-5 py-3">
                {daftarFilter.map((filter) => {
                  const aktif = status === filter.nilai;
                  return (
                    <Link
                      key={filter.nilai || "semua"}
                      href={hrefStatus(filter.nilai)}
                      aria-current={aktif ? "page" : undefined}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${
                        aktif ? "bg-nila-muda text-nila" : "text-tinta-2 hover:bg-kertas hover:text-tinta"
                      }`}
                    >
                      {filter.teks}
                      <span className="angka text-xs font-medium opacity-70">{filter.jumlah}</span>
                    </Link>
                  );
                })}
              </nav>

              {listTampil.length === 0 ? (
                <KeadaanKosong
                  ikon="cari"
                  judul="Tidak ada ujian"
                  deskripsi="Tidak ada ujian dengan status ini."
                  aksi={<TautanTombol href="/dashboard/ujian" teks="Tampilkan semua" />}
                />
              ) : (
                <ul className="divide-y divide-garis">
                  {listTampil.map((ujian) => {
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
                        {[namaMapel(ujian.mapel_ref), `${jumlahSoal} soal`, `${ujian.durasi} menit`, formatTanggal.format(new Date(ujian.created_at))]
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
            </>
          )}
        </Kartu>
      </div>
    </>
  );
}

export default function UjianPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat ujian...</p>}>
      <IsiUjian searchParams={searchParams} />
    </Suspense>
  );
}
