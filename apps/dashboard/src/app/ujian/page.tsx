import type { Metadata } from "next";
import { AplikasiSiswa } from "@/components/siswa/aplikasi-siswa";

export const metadata: Metadata = {
  title: "Kerjakan ujian",
  description: "Halaman siswa untuk mengerjakan ujian lewat peramban.",
};

// Versi web app siswa (tanpa akun; masuk pakai kode ujian dari guru).
export default function KerjakanUjianPage() {
  return <AplikasiSiswa />;
}
