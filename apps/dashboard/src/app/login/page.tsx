import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { login, loginDenganGoogle } from "@/actions/auth";
import { CangkangAuth } from "@/components/auth/cangkang-auth";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";
import { IkonGoogle } from "@/components/ui/ikon-google";

export const metadata: Metadata = { title: "Masuk" };

async function FormLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <form className="flex flex-col gap-5">
      {error && <Pesan jenis="error">{error}</Pesan>}
      <KotakInput nama="email" label="Email" tipe="email" wajib placeholder="guru@sekolah.sch.id" autoComplete="email" />
      <div className="flex flex-col gap-1.5">
        <KotakInput nama="password" label="Kata sandi" tipe="password" wajib minPanjang={6} autoComplete="current-password" />
        <Link href="/lupa-password" className="self-end text-sm font-medium text-nila hover:text-nila-tua">
          Lupa kata sandi?
        </Link>
      </div>
      <Tombol teks="Masuk" teksProses="Memeriksa..." formAction={login} className="w-full" />
    </form>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <CangkangAuth
      judul="Masuk ke dashboard guru"
      deskripsi="Kelola kelas, soal, dan ujian Anda."
      kaki={
        <>
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-nila hover:text-nila-tua">
            Daftar sebagai guru
          </Link>
          <span className="mx-1.5 text-tinta-3">·</span>
          <Link href="/unduh" className="font-semibold text-nila hover:text-nila-tua">
            Unduh aplikasi siswa
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <FormLogin searchParams={searchParams} />
      </Suspense>
      <div className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-tinta-3">
        <span className="h-px flex-1 bg-garis" />
        atau
        <span className="h-px flex-1 bg-garis" />
      </div>
      <form className="mt-6">
        <Tombol teks="Masuk dengan Google" jenis="kedua" ikonKustom={<IkonGoogle className="h-4 w-4" />} formAction={loginDenganGoogle} className="w-full" />
      </form>
    </CangkangAuth>
  );
}
