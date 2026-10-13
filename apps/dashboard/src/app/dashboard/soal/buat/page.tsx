import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSoal } from "@/actions/soal";
import { FormSoal } from "@/components/soal/form-soal";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Tulis soal" };

async function PesanError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <div className="mb-4">
      <Pesan jenis="error">{error}</Pesan>
    </div>
  );
}

async function IsianSoal() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: daftarBank } = await supabase
    .from("bank_soal")
    .select("id, nama")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  return <FormSoal aksi={createSoal} teksSimpan="Simpan soal" daftarBank={daftarBank ?? []} />;
}

export default function BuatSoalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="max-w-3xl">
      <KepalaHalaman judul="Tulis soal" kembali={{ href: "/dashboard/soal", teks: "Bank soal" }} />
      <Suspense fallback={null}>
        <PesanError searchParams={searchParams} />
      </Suspense>
      <Kartu>
        <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
          <IsianSoal />
        </Suspense>
      </Kartu>
    </div>
  );
}
