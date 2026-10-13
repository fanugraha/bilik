import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSoal } from "@/actions/soal";
import { amankanTujuanKembali } from "@/lib/alur";
import { FormSoal } from "@/components/soal/form-soal";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Tulis soal" };

type ParamTulis = Promise<{ bank?: string; kembali?: string; error?: string; sukses?: string }>;

async function IsianSoal({ searchParams }: { searchParams: ParamTulis }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { bank, kembali: kembaliMentah, error, sukses } = await searchParams;
  const kembali = amankanTujuanKembali(kembaliMentah);

  const { data: daftarBank } = await supabase
    .from("bank_soal")
    .select("id, nama")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  // Soal selalu masuk bank: guru yang belum punya bank diarahkan membuatnya dulu
  if (!daftarBank || daftarBank.length === 0) {
    redirect("/dashboard/soal/bank/buat?info=" + encodeURIComponent("Buat bank soal dulu, lalu tulis soal di dalamnya."));
  }

  const bankAktif = daftarBank.find((item) => item.id === bank) ?? daftarBank[0];

  return (
    <>
      <KepalaHalaman
        judul="Tulis soal"
        deskripsi={
          <>
            Soal disimpan ke bank <span className="font-semibold text-tinta">{bankAktif.nama}</span>.
          </>
        }
        kembali={kembali ? { href: kembali, teks: "Kembali ke ujian" } : { href: `/dashboard/soal/bank/${bankAktif.id}`, teks: bankAktif.nama }}
      />
      {(error || sukses) && (
        <div className="mb-4">
          <Pesan jenis={error ? "error" : "sukses"}>{error ?? sukses}</Pesan>
        </div>
      )}
      <Kartu>
        {/* key: form direset bersih setelah "Simpan & tulis lagi" */}
        <FormSoal
          key={sukses ?? "baru"}
          aksi={createSoal}
          teksSimpan="Simpan soal"
          daftarBank={daftarBank}
          bankTerpilih={bankAktif.id}
          kembali={kembali}
          bolehTulisLagi
        />
      </Kartu>
    </>
  );
}

export default function BuatSoalPage({ searchParams }: { searchParams: ParamTulis }) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <IsianSoal searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
