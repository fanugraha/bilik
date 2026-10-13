import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Bank soal" };

type ParamDaftarBank = Promise<{ error?: string; sukses?: string }>;
type BankDenganJumlah = { id: string; nama: string; mapel: string | null; soal: { count: number }[] };

async function DaftarBank({ searchParams }: { searchParams: ParamDaftarBank }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error: errorList } = await supabase
    .from("bank_soal")
    .select("id, nama, mapel, soal(count)")
    .eq("guru_id", user.id)
    .order("nama", { ascending: true });

  const listBank = (data ?? []) as BankDenganJumlah[];
  const { error, sukses } = await searchParams;

  return (
    <div className="space-y-4">
      {error && <Pesan jenis="error">{error}</Pesan>}
      {sukses && <Pesan jenis="sukses">{sukses}</Pesan>}

      {errorList ? (
        <Pesan jenis="error">{errorList.message}</Pesan>
      ) : listBank.length === 0 ? (
        <Kartu tanpaPadding>
          <KeadaanKosong
            ikon="soal"
            judul="Belum ada bank soal"
            deskripsi="Mulai dengan membuat bank, misalnya satu bank per mapel atau per bab. Setelah itu tulis soal di dalamnya."
            aksi={<TautanTombol href="/dashboard/soal/bank/buat" teks="Buat bank pertama" jenis="utama" ikon="tambah" />}
          />
        </Kartu>
      ) : (
        <Kartu tanpaPadding>
          <ul className="divide-y divide-garis">
            {listBank.map((bank) => {
              const jumlahSoal = bank.soal[0]?.count ?? 0;
              return (
                <li key={bank.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/dashboard/soal/bank/${bank.id}`} className="group min-w-0">
                    <span className="block truncate font-semibold text-tinta group-hover:text-nila">{bank.nama}</span>
                    <span className="block text-sm text-tinta-2">
                      {bank.mapel ? `${bank.mapel}, ` : ""}
                      {jumlahSoal === 0 ? "Belum ada soal" : `${jumlahSoal} soal`}
                    </span>
                  </Link>
                  <div className="flex items-center gap-1">
                    <TautanTombol
                      href={`/dashboard/soal/buat?bank=${bank.id}`}
                      teks={jumlahSoal === 0 ? "Tulis soal pertama" : "Tulis soal"}
                      jenis={jumlahSoal === 0 ? "utama" : "kedua"}
                      ukuran="kecil"
                      ikon="tambah"
                    />
                    <TautanTombol href={`/dashboard/soal/bank/${bank.id}`} teks="Buka" jenis="hantu" ukuran="kecil" />
                  </div>
                </li>
              );
            })}
          </ul>
        </Kartu>
      )}
    </div>
  );
}

export default function BankSoalPage({ searchParams }: { searchParams: ParamDaftarBank }) {
  return (
    <>
      <KepalaHalaman
        judul="Bank soal"
        deskripsi="Setiap bank berisi kumpulan soal, misalnya per mapel atau bab. Soal di bank bisa dipakai berulang di banyak ujian."
        aksi={<TautanTombol href="/dashboard/soal/bank/buat" teks="Buat bank" jenis="utama" ikon="tambah" />}
      />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat bank soal...</p>}>
        <DaftarBank searchParams={searchParams} />
      </Suspense>
    </>
  );
}
