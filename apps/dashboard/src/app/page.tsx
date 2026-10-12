import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function StatusDb() {
  await connection();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("guru")
    .select("*", { count: "exact", head: true });
  if (error) return <p>Gagal tersambung: {error.message}</p>;
  return <p>Tersambung ke Bilik. Tabel guru: {count ?? 0} baris.</p>;
}

export default function Home() {
  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>Dashboard Bilik</h1>
      <Suspense fallback={<p>Menyambung ke database...</p>}>
        <StatusDb />
      </Suspense>
    </main>
  );
}
