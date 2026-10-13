import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aturUlangPassword } from "@/actions/auth";
import { CangkangAuth } from "@/components/auth/cangkang-auth";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";

export const metadata: Metadata = { title: "Kata sandi baru" };

async function FormAturUlang({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Halaman ini hanya bisa dibuka lewat link email (callback membuat sesi)
  if (!user) redirect("/lupa-password?error=" + encodeURIComponent("Link sudah kedaluwarsa. Minta link baru."));

  const { error } = await searchParams;

  return (
    <form className="flex flex-col gap-5">
      {error && <Pesan jenis="error">{error}</Pesan>}
      <KotakInput nama="password" label="Kata sandi baru" tipe="password" wajib minPanjang={6} autoComplete="new-password" bantuan="Minimal 6 karakter." />
      <KotakInput nama="konfirmasi_password" label="Ulangi kata sandi baru" tipe="password" wajib minPanjang={6} autoComplete="new-password" />
      <Tombol teks="Simpan kata sandi" teksProses="Menyimpan..." formAction={aturUlangPassword} className="w-full" />
    </form>
  );
}

export default function AturUlangPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <CangkangAuth judul="Buat kata sandi baru" deskripsi="Setelah disimpan, Anda langsung masuk ke dashboard.">
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <FormAturUlang searchParams={searchParams} />
      </Suspense>
    </CangkangAuth>
  );
}
