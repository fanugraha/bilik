import type { Metadata } from "next";
import { CangkangAuth } from "@/components/auth/cangkang-auth";
import { TautanTombol } from "@/components/ui/tautan-tombol";

export const metadata: Metadata = { title: "Unduh aplikasi" };

const apkUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unduhan/bilik-siswa.apk`;

const langkah = [
  "Buka halaman ini dari HP Android, lalu tekan tombol Unduh APK.",
  "Jika muncul peringatan, pilih Izinkan dari sumber ini / Install unknown apps.",
  "Buka file yang terunduh, lalu tekan Pasang (Install).",
  "Setelah terpasang, buka aplikasi Bilik dan masukkan kode ujian dari guru.",
];

export default function UnduhPage() {
  return (
    <CangkangAuth
      judul="Unduh aplikasi Bilik"
      deskripsi="Aplikasi siswa untuk mengerjakan ujian. Khusus Android."
      kaki={
        <>
          Sudah punya akun guru?{" "}
          <a href="/login" className="font-semibold text-nila hover:text-nila-tua">
            Masuk dashboard
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <TautanTombol href={apkUrl} teks="Unduh APK (Android)" ikon="unduh" jenis="utama" className="w-full" unduh />
        <TautanTombol href="/ujian" teks="Kerjakan lewat web (tanpa pasang)" ikon="ujian" jenis="kedua" className="w-full" />

        <ol className="space-y-2.5 text-sm text-tinta-2">
          {langkah.map((teks, indeks) => (
            <li key={teks} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kertas text-xs font-semibold text-tinta-2">
                {indeks + 1}
              </span>
              {teks}
            </li>
          ))}
        </ol>

        <p className="rounded-lg border border-garis bg-kertas p-3 text-xs text-tinta-2">
          Untuk iPhone/iPad: app ini belum tersedia lewat App Store. Hubungi guru untuk cara pemasangan.
        </p>
      </div>
    </CangkangAuth>
  );
}
