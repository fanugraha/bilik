import { Suspense } from "react";
import Link from "next/link";
import { signup } from "@/actions/auth";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";

async function FormDaftar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      {error && (
        <div className="mb-6">
          <Pesan jenis="error">{error}</Pesan>
        </div>
      )}

      <form className="flex flex-col gap-5">
        <KotakInput
          nama="nama"
          label="Nama"
          tipe="text"
          wajib
          placeholder="Nama Anda"
        />
        <KotakInput
          nama="email"
          label="Email"
          tipe="email"
          wajib
          placeholder="guru@sekolah.com"
        />
        <KotakInput
          nama="password"
          label="Kata sandi"
          tipe="password"
          wajib
          minPanjang={6}
        />
        <KotakInput
          nama="konfirmasi_password"
          label="Konfirmasi kata sandi"
          tipe="password"
          wajib
          minPanjang={6}
        />
        <div className="mt-2">
          <Tombol teks="Daftar" jenis="utama" formAction={signup} />
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
          Masuk di sini
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Dashboard Bilik
          </h1>
          <p className="mt-3 text-gray-600">Daftar sebagai guru baru</p>
        </div>
        <Suspense fallback={null}>
          <FormDaftar searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
