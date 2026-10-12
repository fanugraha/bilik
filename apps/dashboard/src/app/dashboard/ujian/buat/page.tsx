import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createUjian } from "@/actions/ujian";
import { IsianUjian } from "@/components/isian-ujian";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";

async function FormUjianBaru({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listKelas } = await supabase
    .from("kelas")
    .select("id, nama")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  const { error: errorQuery } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}

      <Kartu>
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Buat Ujian Baru</h2>
        <form action={createUjian} className="space-y-6">
          <IsianUjian listKelas={listKelas ?? []} teksSimpan="Buat Ujian" hrefBatal="/dashboard/ujian" />
        </form>
      </Kartu>
    </div>
  );
}

export default function BuatUjianPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Buat Ujian</h1>
        <Link href="/dashboard/ujian" className="text-sm text-indigo-600 hover:underline">
          ← Kembali
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <FormUjianBaru searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
