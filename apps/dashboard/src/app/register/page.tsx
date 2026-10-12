import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { signup } from "@/actions/auth";
import { CangkangAuth } from "@/components/cangkang-auth";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";

export const metadata: Metadata = { title: "Daftar" };

async function FormDaftar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <form className="flex flex-col gap-5">
      {error && <Pesan jenis="error">{error}</Pesan>}
      <KotakInput nama="nama" label="Nama" wajib placeholder="Contoh: Rina Kusuma, S.Pd." autoComplete="name" bantuan="Nama ini tampil di dashboard." />
      <KotakInput nama="email" label="Email" tipe="email" wajib placeholder="guru@sekolah.sch.id" autoComplete="email" />
      <KotakInput nama="password" label="Kata sandi" tipe="password" wajib minPanjang={6} autoComplete="new-password" bantuan="Minimal 6 karakter." />
      <KotakInput nama="konfirmasi_password" label="Ulangi kata sandi" tipe="password" wajib minPanjang={6} autoComplete="new-password" />
      <Tombol teks="Buat akun" teksProses="Membuat akun..." formAction={signup} className="w-full" />
    </form>
  );
}

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <CangkangAuth
      judul="Daftar sebagai guru"
      deskripsi="Satu akun untuk semua kelas dan ujian Anda."
      kaki={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-nila hover:text-nila-tua">
            Masuk
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <FormDaftar searchParams={searchParams} />
      </Suspense>
    </CangkangAuth>
  );
}
