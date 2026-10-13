import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createUjian } from "@/actions/ujian";
import { ambilAksiAlur } from "@/lib/alur";
import { ambilDaftarMapel } from "@/lib/mapel";
import { IsianInfoUjian } from "@/components/ujian/isian-ujian";
import { PenandaLangkah } from "@/components/ujian/penanda-langkah";
import { Tombol } from "@/components/ui/button";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";

export const metadata: Metadata = { title: "Buat ujian" };

type ParamBuatUjian = Promise<{ error?: string; bank?: string }>;

async function FormUjianBaru({ searchParams }: { searchParams: ParamBuatUjian }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error: errorQuery, bank } = await searchParams;
  const [{ data: bankAsal }, daftarMapel, aksiLanjut] = await Promise.all([
    bank
      ? supabase.from("bank_soal").select("id, nama, mapel_id").eq("id", bank).eq("guru_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    ambilDaftarMapel(supabase),
    ambilAksiAlur(supabase),
  ]);

  return (
    <>
      {errorQuery && (
        <div className="mb-4">
          <Pesan jenis="error">{errorQuery}</Pesan>
        </div>
      )}
      {aksiLanjut && aksiLanjut.href !== "/dashboard/ujian/buat" && (
        <div className="mb-4">
          <Pesan jenis="info">
            Kelas, siswa, atau soal belum siap. Sebaiknya selesaikan dulu{" "}
            <Link href={aksiLanjut.href} className="font-semibold underline underline-offset-2">
              {aksiLanjut.judul}
            </Link>
            . Ujian tetap bisa dibuat sekarang bila Anda ingin menyiapkannya lebih dulu.
          </Pesan>
        </div>
      )}
      {bankAsal && (
        <div className="mb-4">
          <Pesan jenis="info">
            Soal akan diambil dari bank <span className="font-semibold">{bankAsal.nama}</span> di langkah berikutnya.
          </Pesan>
        </div>
      )}
      <Kartu>
        <form action={createUjian}>
          {bankAsal && <input type="hidden" name="bank" value={bankAsal.id} />}
          <IsianInfoUjian daftarMapel={daftarMapel} mapelIdAwal={bankAsal?.mapel_id ?? undefined} />
          <div className="mt-6 flex flex-row-reverse justify-start gap-2 border-t border-garis pt-5">
            <Tombol teks="Lanjut: ambil soal" teksProses="Menyimpan..." />
            <TautanTombol href={bankAsal ? `/dashboard/soal/bank/${bankAsal.id}` : "/dashboard/ujian"} teks="Batal" jenis="hantu" />
          </div>
        </form>
      </Kartu>
    </>
  );
}

export default function BuatUjianPage({ searchParams }: { searchParams: ParamBuatUjian }) {
  return (
    <div className="max-w-3xl">
      <KepalaHalaman
        judul="Buat ujian"
        deskripsi="Isi info singkat dulu. Soal, kelas, dan aturan diatur di langkah berikutnya; semuanya tersimpan sebagai draft."
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
      />
      <PenandaLangkah aktif="info" kondisi={null} />
      <Suspense fallback={<p className="text-sm text-tinta-2">Memuat...</p>}>
        <FormUjianBaru searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
