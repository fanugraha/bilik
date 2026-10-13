import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { simpanProfil, ubahKataSandi } from "@/actions/profil";
import { ATURAN_KATA_SANDI, PANJANG_KATA_SANDI_MIN, namaMasihBawaan, punyaLoginEmail } from "@/lib/profil";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Profil" };

type ParamProfil = Promise<{ tab?: string; error?: string; sukses?: string }>;
type Tab = "profil" | "keamanan";

const daftarTab: { kunci: Tab; teks: string; href: string }[] = [
  { kunci: "profil", teks: "Profil", href: "/dashboard/profil" },
  { kunci: "keamanan", teks: "Keamanan", href: "/dashboard/profil?tab=keamanan" },
];

// Tab lewat URL: tiap tab punya satu form dan satu tombol simpan, sehingga guru tidak
// mengira tombol di satu bagian ikut menyimpan isian bagian lain.
function NavigasiTab({ aktif }: { aktif: Tab }) {
  return (
    <nav aria-label="Bagian profil" className="mb-6 flex gap-1 border-b border-garis">
      {daftarTab.map((tab) => (
        <Link
          key={tab.kunci}
          href={tab.href}
          aria-current={tab.kunci === aktif ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab.kunci === aktif ? "border-nila text-nila" : "border-transparent text-tinta-2 hover:text-tinta"
          }`}
        >
          {tab.teks}
        </Link>
      ))}
    </nav>
  );
}

async function IsiProfil({ searchParams }: { searchParams: ParamProfil }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: guru } = await supabase.from("guru").select("nama, email").eq("id", user.id).single();
  const { tab, error, sukses } = await searchParams;
  const tabAktif: Tab = tab === "keamanan" ? "keamanan" : "profil";

  const email = guru?.email ?? user.email ?? "";
  const nama = guru?.nama ?? "";
  const akunEmail = punyaLoginEmail(user);

  return (
    <div className="max-w-2xl">
      <NavigasiTab aktif={tabAktif} />

      <div className="space-y-6">
        {error && <Pesan jenis="error">{error}</Pesan>}
        {sukses && <Pesan jenis="sukses">{sukses}</Pesan>}

        {tabAktif === "profil" ? (
          <>
            {!error && !sukses && namaMasihBawaan(nama, email) && (
              <Pesan jenis="info">Isi nama lengkap Anda. Nama ini tampil di dashboard dan nilai ujian.</Pesan>
            )}
            <Kartu judul="Data diri">
              <form className="flex flex-col gap-5">
                <KotakInput
                  nama="nama"
                  label="Nama lengkap"
                  wajib
                  defaultValue={namaMasihBawaan(nama, email) ? "" : nama}
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  autoComplete="name"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-tinta">Email</span>
                  <p className="text-sm text-tinta-2">{email}</p>
                </div>
                <Tombol teks="Simpan nama" teksProses="Menyimpan..." formAction={simpanProfil} className="self-start" />
              </form>
            </Kartu>
          </>
        ) : (
          <Kartu
            judul={akunEmail ? "Ganti kata sandi" : "Buat kata sandi"}
            deskripsi={akunEmail ? undefined : "Agar Anda juga bisa masuk dengan email dan kata sandi, selain lewat Google."}
          >
            <form className="flex flex-col gap-5">
              {akunEmail && (
                <KotakInput nama="kata_sandi_lama" label="Kata sandi lama" tipe="password" wajib autoComplete="current-password" />
              )}
              <KotakInput
                nama="password"
                label="Kata sandi baru"
                tipe="password"
                wajib
                minPanjang={PANJANG_KATA_SANDI_MIN}
                autoComplete="new-password"
                bantuan={ATURAN_KATA_SANDI}
              />
              <KotakInput
                nama="konfirmasi_password"
                label="Ulangi kata sandi baru"
                tipe="password"
                wajib
                minPanjang={PANJANG_KATA_SANDI_MIN}
                autoComplete="new-password"
              />
              <Tombol teks="Simpan kata sandi baru" teksProses="Menyimpan..." formAction={ubahKataSandi} className="self-start" />
            </form>
          </Kartu>
        )}
      </div>
    </div>
  );
}

export default function ProfilPage({ searchParams }: { searchParams: ParamProfil }) {
  return (
    <>
      <KepalaHalaman judul="Profil" deskripsi="Data diri dan keamanan akun Anda." />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat profil...</p>}>
        <IsiProfil searchParams={searchParams} />
      </Suspense>
    </>
  );
}
