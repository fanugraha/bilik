import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { LencanaStatusUjian } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";

export const metadata: Metadata = { title: "Beranda" };

type LangkahMulai = { judul: string; deskripsi: string; href: string; selesai: boolean };

function hrefUjian(ujian: { id: string; status: string }) {
  if (ujian.status === "draft") return `/dashboard/ujian/${ujian.id}/soal`;
  if (ujian.status === "lobby" || ujian.status === "berjalan") return `/dashboard/ujian/${ujian.id}/lobby`;
  return `/dashboard/ujian/${ujian.id}/nilai`;
}

async function IsiBeranda() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: guru }, { count: jumlahKelas }, { count: jumlahSiswa }, { count: jumlahSoal }, { data: listUjian }] =
    await Promise.all([
      supabase.from("guru").select("nama").eq("id", user.id).single(),
      supabase.from("kelas").select("id", { count: "exact", head: true }).eq("guru_id", user.id),
      // RLS membatasi ke siswa di kelas milik guru ini
      supabase.from("siswa").select("id", { count: "exact", head: true }),
      supabase.from("soal").select("id", { count: "exact", head: true }).eq("guru_id", user.id),
      supabase
        .from("ujian")
        .select("id, judul, mapel, status, kode, durasi, created_at")
        .eq("guru_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const listUjianAktif = (listUjian ?? []).filter((ujian) => ujian.status === "lobby" || ujian.status === "berjalan");

  const jumlahPesertaPerUjian = new Map<string, number>();
  if (listUjianAktif.length > 0) {
    const { data: listPeserta } = await supabase
      .from("peserta")
      .select("ujian_id")
      .in(
        "ujian_id",
        listUjianAktif.map((ujian) => ujian.id),
      );
    for (const peserta of listPeserta ?? []) {
      jumlahPesertaPerUjian.set(peserta.ujian_id, (jumlahPesertaPerUjian.get(peserta.ujian_id) ?? 0) + 1);
    }
  }

  const listLangkah: LangkahMulai[] = [
    { judul: "Buat kelas", deskripsi: "Misalnya X IPA 1.", href: "/dashboard/kelas", selesai: (jumlahKelas ?? 0) > 0 },
    { judul: "Masukkan siswa", deskripsi: "Tempel daftar nama dari Excel.", href: "/dashboard/kelas", selesai: (jumlahSiswa ?? 0) > 0 },
    { judul: "Tulis soal", deskripsi: "PG, benar/salah, atau essay.", href: "/dashboard/soal/buat", selesai: (jumlahSoal ?? 0) > 0 },
    { judul: "Susun ujian", deskripsi: "Pilih soal dan kelas peserta.", href: "/dashboard/ujian/buat", selesai: (listUjian ?? []).length > 0 },
  ];
  const semuaLangkahSelesai = listLangkah.every((langkah) => langkah.selesai);

  const ringkasan = [
    { teks: "Kelas", jumlah: jumlahKelas ?? 0, href: "/dashboard/kelas" },
    { teks: "Siswa", jumlah: jumlahSiswa ?? 0, href: "/dashboard/kelas" },
    { teks: "Soal di bank soal", jumlah: jumlahSoal ?? 0, href: "/dashboard/soal" },
  ];

  return (
    <>
      <KepalaHalaman
        judul={`Halo, ${guru?.nama ?? "Guru"}`}
        deskripsi="Ringkasan kelas dan ujian Anda."
        aksi={<TautanTombol href="/dashboard/ujian/buat" teks="Buat ujian" jenis="utama" ikon="tambah" />}
      />

      <div className="space-y-6">
        {listUjianAktif.map((ujian) => (
          <section
            key={ujian.id}
            className="flex flex-col gap-5 rounded-xl bg-papan p-6 text-white sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-white/70">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                {ujian.status === "lobby" ? "Lobby dibuka, siswa sedang bergabung" : "Ujian sedang berjalan"}
              </p>
              <h2 className="mt-1 truncate text-xl font-bold">{ujian.judul}</h2>
              <p className="mt-1 text-sm text-white/70">{jumlahPesertaPerUjian.get(ujian.id) ?? 0} siswa di ruang ujian</p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div>
                <p className="text-xs text-white/60">Kode ujian</p>
                <p className="angka text-3xl font-extrabold tracking-[0.15em]">{ujian.kode}</p>
              </div>
              <Link
                href={`/dashboard/ujian/${ujian.id}/lobby`}
                className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-papan hover:bg-nila-muda"
              >
                Buka ruang kontrol
              </Link>
            </div>
          </section>
        ))}

        {!semuaLangkahSelesai && (
          <Kartu judul="Mulai dari sini" deskripsi="Empat langkah sebelum ujian pertama Anda.">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {listLangkah.map((langkah, indeks) => (
                <li key={langkah.judul}>
                  <Link
                    href={langkah.href}
                    className={`flex h-full gap-3 rounded-lg border p-4 transition-colors ${
                      langkah.selesai ? "border-garis bg-kertas" : "border-garis hover:border-nila hover:bg-nila-muda"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        langkah.selesai ? "bg-hijau text-white" : "bg-nila-muda text-nila"
                      }`}
                    >
                      {langkah.selesai ? <Ikon nama="centang" className="h-4 w-4" /> : indeks + 1}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${langkah.selesai ? "text-tinta-2 line-through" : "text-tinta"}`}>
                        {langkah.judul}
                      </span>
                      <span className="mt-0.5 block text-xs text-tinta-2">{langkah.deskripsi}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Kartu>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Kartu
            judul="Ujian terbaru"
            aksi={<TautanTombol href="/dashboard/ujian" teks="Lihat semua" jenis="hantu" ukuran="kecil" />}
            tanpaPadding
          >
            {(listUjian ?? []).length === 0 ? (
              <KeadaanKosong
                ikon="ujian"
                judul="Belum ada ujian"
                deskripsi="Susun ujian dari soal di bank soal, lalu buka lobby saat kelas siap."
                aksi={<TautanTombol href="/dashboard/ujian/buat" teks="Buat ujian" jenis="utama" ikon="tambah" />}
              />
            ) : (
              <ul className="divide-y divide-garis">
                {(listUjian ?? []).map((ujian) => (
                  <li key={ujian.id}>
                    <Link href={hrefUjian(ujian)} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-kertas">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-tinta">{ujian.judul}</span>
                        <span className="block text-xs text-tinta-2">
                          {ujian.mapel ? `${ujian.mapel}, ` : ""}
                          {ujian.durasi} menit
                        </span>
                      </span>
                      <LencanaStatusUjian status={ujian.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>

          <Kartu judul="Ringkasan" tanpaPadding>
            <ul className="divide-y divide-garis">
              {ringkasan.map((item) => (
                <li key={item.teks}>
                  <Link href={item.href} className="flex items-center justify-between px-5 py-3.5 hover:bg-kertas">
                    <span className="text-sm text-tinta-2">{item.teks}</span>
                    <span className="angka text-lg font-bold text-tinta">{item.jumlah}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Kartu>
        </div>
      </div>
    </>
  );
}

export default function BerandaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat beranda...</p>}>
      <IsiBeranda />
    </Suspense>
  );
}
