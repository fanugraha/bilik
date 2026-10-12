import { Suspense } from "react";
import { login, signup } from "@/actions/auth";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";

async function FormLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      {error && <Pesan jenis="error">{error}</Pesan>}

      <form className="flex flex-col gap-4">
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
          nama="nama"
          label="Nama (untuk daftar baru)"
          tipe="text"
          placeholder="Nama Anda"
        />
        <div className="flex gap-3">
          <Tombol teks="Masuk" jenis="utama" formAction={login} />
          <Tombol teks="Daftar" jenis="kedua" formAction={signup} />
        </div>
      </form>
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Bilik</h1>
          <p className="mt-2 text-sm text-gray-600">
            Masuk atau daftar sebagai guru
          </p>
        </div>
        <Suspense fallback={null}>
          <FormLogin searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
