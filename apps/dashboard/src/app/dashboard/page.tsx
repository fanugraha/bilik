import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";

async function IsiDashboard() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: guru } = await supabase
    .from("guru")
    .select("nama, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-700">
        Halo, <span className="font-semibold">{guru?.nama ?? user.email}</span>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/kelas">
          <Kartu>
            <h2 className="font-semibold text-gray-900">Kelola Kelas</h2>
            <p className="mt-1 text-sm text-gray-600">
              Buat dan atur kelas serta daftar siswa.
            </p>
          </Kartu>
        </Link>
        <Link href="/dashboard/soal">
          <Kartu>
            <h2 className="font-semibold text-gray-900">Bank Soal</h2>
            <p className="mt-1 text-sm text-gray-600">
              Buat dan atur soal PG serta essay.
            </p>
          </Kartu>
        </Link>
        <Link href="/dashboard/ujian">
          <Kartu>
            <h2 className="font-semibold text-gray-900">Kelola Ujian</h2>
            <p className="mt-1 text-sm text-gray-600">
              Susun ujian, buka lobby, dan pantau ruang kontrol.
            </p>
          </Kartu>
        </Link>
      </div>

      <form>
        <Tombol teks="Keluar" jenis="kedua" formAction={logout} />
      </form>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard Bilik</h1>
      <Suspense fallback={<p className="text-gray-500">Memuat...</p>}>
        <IsiDashboard />
      </Suspense>
    </main>
  );
}
