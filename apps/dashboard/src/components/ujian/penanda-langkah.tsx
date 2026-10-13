import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Ikon } from "@/components/ui/ikon";
import { susunLangkahUjian, type KondisiUjian, type KunciLangkahUjian } from "@/lib/langkah-ujian";

// Jumlah soal & kelas ujian, dasar status tiap langkah wizard
export async function ambilKondisiUjian(supabase: SupabaseClient, ujianId: string): Promise<KondisiUjian> {
  const [{ count: jumlahSoal }, { count: jumlahKelas }] = await Promise.all([
    supabase.from("ujian_soal").select("soal_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
    supabase.from("ujian_kelas").select("kelas_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
  ]);
  return { ujianId, jumlahSoal: jumlahSoal ?? 0, jumlahKelas: jumlahKelas ?? 0 };
}

// Penanda 4 langkah menyiapkan ujian. Langkah yang sudah tersimpan bisa diklik untuk melompat.
export function PenandaLangkah({ aktif, kondisi }: { aktif: KunciLangkahUjian; kondisi: KondisiUjian | null }) {
  const { listLangkah } = susunLangkahUjian(kondisi);

  return (
    <nav aria-label="Langkah menyiapkan ujian" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max gap-2">
        {listLangkah.map((langkah, indeks) => {
          const sedang = langkah.kunci === aktif;
          const isi = (
            <>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  sedang ? "bg-nila text-white" : langkah.selesai ? "bg-hijau text-white" : "bg-kertas text-tinta-2 ring-1 ring-garis ring-inset"
                }`}
              >
                {langkah.selesai && !sedang ? <Ikon nama="centang" className="h-3.5 w-3.5" /> : indeks + 1}
              </span>
              <span className={`text-sm font-semibold ${sedang ? "text-nila" : "text-tinta-2"}`}>{langkah.judul}</span>
            </>
          );
          const kelas = `flex items-center gap-2 rounded-lg border px-3 py-2 ${
            sedang ? "border-nila bg-nila-muda" : "border-garis bg-permukaan"
          }`;

          return (
            <li key={langkah.kunci} className="flex items-center gap-2">
              {langkah.href && !sedang ? (
                <Link href={langkah.href} className={`${kelas} hover:border-nila`}>
                  {isi}
                </Link>
              ) : (
                <span aria-current={sedang ? "step" : undefined} className={kelas}>
                  {isi}
                </span>
              )}
              {indeks < listLangkah.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-garis-tegas" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
