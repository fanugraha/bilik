import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NavigasiSamping } from "@/components/layout/navigasi-samping";

async function NavigasiGuru() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let namaGuru = "";
  if (user) {
    const { data: guru } = await supabase.from("guru").select("nama").eq("id", user.id).single();
    namaGuru = guru?.nama ?? user.email ?? "";
  }

  return <NavigasiSamping namaGuru={namaGuru} />;
}

// Kerangka statis selama data guru dimuat (tanpa hook URL agar aman untuk prerender)
function KerangkaNavigasi() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-garis bg-permukaan lg:block" aria-hidden="true" />
      <div className="sticky top-0 z-30 h-14 border-b border-garis bg-permukaan lg:hidden" aria-hidden="true" />
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-64">
      <Suspense fallback={<KerangkaNavigasi />}>
        <NavigasiGuru />
      </Suspense>
      <main className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
