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
import { Pesan } from "@/components/ui/alert";
import { namaMasihBawaan } from "@/lib/profil";
import { susunLangkahMulai } from "@/lib/alur";

export const metadata: Metadata = { title: "Beranda" };

type UjianRingkas = { id: string; judul: string; mapel: string | null; status: string; kode: string; durasi: number };

function hrefUjian(ujian: UjianRingkas) {
  if (ujian.status === "draft") return `/dashboard/ujian/${ujian.id}/soal`;
  if (ujian.status === "lobby" || ujian.status === "berjalan") return `/dashboard/ujian/${ujian.id}/lobby`;
  return `/dashboard/ujian/${ujian.id}/nilai`;
}

// Kata aksi mengikuti tujuan klik, supaya guru tahu baris itu membawa ke mana
function labelAksiUjian(status: string) {
  if (status === "draft") return "Susun soal";
  if (status === "lobby" || status === "berjalan") return "Pantau";
  return "Lihat nilai";
}

async function IsiBeranda() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: guru }, { data: listKelas }, { count: jumlahSiswa }, { count: jumlahSoal }, { data: listUjian }, { data: listBank }] =
    await Promise.all([
      supabase.from("guru").select("nama, email").eq("id", user.id).single(),
      supabase.from("kelas").select("id, siswa(count)").eq("guru_id", user.id).order("nama", { ascending: true }),
      // RLS membatasi ke siswa di kelas milik guru ini
      supabase.from("siswa").select("id", { count: "exact", head: true }),
      supabase.from("soal").select("id", { count: "exact", head: true }).eq("guru_id", user.id),
      supabase
        .from("ujian")
        .select("id, judul, mapel, status, kode, durasi, created_at")
        .eq("guru_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("bank_soal").select("id").eq("guru_id", user.id).order("created_at", { ascending: true }).limit(1),
    ]);

  const daftarKelas = (listKelas ?? []) as { id: string; siswa: { count: number }[] }[];
  const jumlahKelas = daftarKelas.length;

  const semuaUjian = (listUjian ?? []) as UjianRingkas[];
  const listUjianAktif = semuaUjian.filter((ujian) => ujian.status === "lobby" || ujian.status === "berjalan");
  // Ujian aktif sudah tampil sebagai blok pantau di atas, jadi keluar dari daftar agar tidak dobel
  const listUjianLain = semuaUjian.filter((ujian) => ujian.status !== "lobby" && ujian.status !== "berjalan");

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

  const listLangkah = susunLangkahMulai({
    jumlahKelas,
    kelasTanpaSiswaId: daftarKelas.find((kelas) => (kelas.siswa[0]?.count ?? 0) === 0)?.id ?? null,
    adaSiswa: (jumlahSiswa ?? 0) > 0,
    bankPertamaId: listBank?.[0]?.id ?? null,
    adaSoal: (jumlahSoal ?? 0) > 0,
    adaUjian: semuaUjian.length > 0,
  });
  const semuaLangkahSelesai = listLangkah.every((langkah) => langkah.selesai);
  // Saat data masih awal, aksi utama mengikuti langkah terdekat, bukan langsung "Buat ujian"
  const langkahBerikutnya = listLangkah.find((langkah) => langkah.berikutnya) ?? null;

  const ringkasan = [
    { teks: "Kelas", jumlah: jumlahKelas, href: "/dashboard/kelas" },
    { teks: "Siswa", jumlah: jumlahSiswa ?? 0, href: "/dashboard/kelas" },
    { teks: "Soal", jumlah: jumlahSoal ?? 0, href: "/dashboard/soal" },
  ];

  // Aksi utama header mengikuti keadaan: pantau dulu bila ada ujian hidup,
  // lalu langkah terdekat saat data masih awal, baru "Buat ujian" bila sudah cukup
  const ujianPrioritas = listUjianAktif[0] ?? null;
  const aksiUtama = ujianPrioritas
    ? { href: `/dashboard/ujian/${ujianPrioritas.id}/lobby`, teks: "Pantau ujian", ikon: "layar-penuh" as const }
    : langkahBerikutnya
      ? { href: langkahBerikutnya.href, teks: langkahBerikutnya.judul, ikon: "tambah" as const }
      : { href: "/dashboard/ujian/buat", teks: "Buat ujian", ikon: "tambah" as const };

  return (
    <>
      <KepalaHalaman
        judul={`Halo, ${guru?.nama ?? "Guru"}`}
        deskripsi="Ringkasan kelas dan ujian Anda."
        aksi={<TautanTombol href={aksiUtama.href} teks={aksiUtama.teks} jenis="utama" ikon={aksiUtama.ikon} />}
      />

      <div className="space-y-6">
        {listUjianAktif.length > 0 && (
          <div className="space-y-3">
            {listUjianAktif.map((ujian) => (
              <section
                key={ujian.id}
                className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-hijau" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-hijau">
                      {ujian.status === "lobby" ? "Lobby dibuka, siswa sedang bergabung" : "Ujian sedang berjalan"}
                    </p>
                    <h2 className="mt-0.5 truncate text-lg font-bold text-tinta">{ujian.judul}</h2>
                    <p className="mt-0.5 text-sm text-tinta-2">
                      {jumlahPesertaPerUjian.get(ujian.id) ?? 0} siswa di ruang ujian
                      {ujian.mapel ? `, ${ujian.mapel}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-5">
                  <div>
                    <p className="text-xs text-tinta-2">Kode ujian</p>
                    <p className="angka text-2xl font-extrabold tracking-[0.15em] text-papan">{ujian.kode}</p>
                  </div>
                  <TautanTombol href={`/dashboard/ujian/${ujian.id}/lobby`} teks="Buka ruang kontrol" jenis="utama" />
                </div>
              </section>
            ))}
          </div>
        )}

        {namaMasihBawaan(guru?.nama, guru?.email ?? user.email) && (
          <Pesan jenis="info">
            Profil Anda belum lengkap.{" "}
            <Link href="/dashboard/profil" className="underline underline-offset-2">
              Isi nama lengkap
            </Link>{" "}
            agar tampil dengan benar di dashboard dan nilai ujian.
          </Pesan>
        )}

        <Kartu tanpaPadding>
          <ul className="grid grid-cols-3 divide-x divide-garis">
            {ringkasan.map((item) => (
              <li key={item.teks}>
                <Link href={item.href} className="flex flex-col gap-0.5 px-5 py-4 hover:bg-kertas">
                  <span className="text-xs font-medium text-tinta-2">{item.teks}</span>
                  <span className="angka text-2xl font-bold text-tinta">{item.jumlah}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Kartu>

        {!semuaLangkahSelesai && (
          <Kartu judul="Mulai dari sini" deskripsi="Lima langkah sebelum ujian pertama Anda. Klik langkah yang ditandai.">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listLangkah.map((langkah, indeks) => (
                <li key={langkah.judul}>
                  <Link
                    href={langkah.href}
                    aria-current={langkah.berikutnya ? "step" : undefined}
                    className={`flex h-full gap-3 rounded-lg border p-4 transition-colors ${
                      langkah.selesai
                        ? "border-garis bg-kertas"
                        : langkah.berikutnya
                          ? "border-nila bg-nila-muda ring-1 ring-nila"
                          : "border-garis hover:border-nila hover:bg-nila-muda"
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
                      {langkah.berikutnya && <span className="mt-2 block text-xs font-semibold text-nila">Langkah berikutnya →</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Kartu>
        )}

        {listUjianLain.length > 0 && (
          <Kartu
            judul="Ujian terbaru"
            aksi={<TautanTombol href="/dashboard/ujian" teks="Lihat semua" jenis="hantu" ukuran="kecil" />}
            tanpaPadding
          >
            <ul className="divide-y divide-garis">
              {listUjianLain.map((ujian) => (
                <li key={ujian.id}>
                  <Link href={hrefUjian(ujian)} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-kertas">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-tinta">{ujian.judul}</span>
                      <span className="block text-xs text-tinta-2">
                        {ujian.mapel ? `${ujian.mapel}, ` : ""}
                        {ujian.durasi} menit
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <LencanaStatusUjian status={ujian.status} />
                      <span className="hidden items-center gap-0.5 text-xs font-semibold text-nila sm:inline-flex">
                        {labelAksiUjian(ujian.status)}
                        <Ikon nama="lanjut" className="h-3.5 w-3.5" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Kartu>
        )}
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
