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
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      {error && (
        <div className="mb-6">
          <Pesan jenis="error">{error}</Pesan>
        </div>
      )}

      <form className="flex flex-col gap-5">
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
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Tombol teks="Masuk" jenis="utama" formAction={login} />
          <Tombol teks="Daftar" jenis="kedua" formAction={signup} />
        </div>
      </form>
    </div>
  );
}

export default function LoginPage({
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
          <p className="mt-3 text-gray-600">
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
