"use client";

import { BilahAtas } from "@/components/siswa/rangka-siswa";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { kelasTombol } from "@/components/ui/gaya-tombol";

export function LayarSelesai({ nama, kode, judul, onKeluar }: { nama: string; kode: string; judul: string; onKeluar: () => void }) {
  const waktu = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <BilahAtas judul={judul} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Kartu>
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-hijau-muda text-hijau">
                <Ikon nama="centang" className="h-9 w-9" />
              </span>
              <h1 className="mt-5 text-lg font-bold text-tinta">Jawaban terkirim</h1>
              <p className="mt-1.5 max-w-md text-sm text-tinta-2">Jawaban Anda sudah diterima. Hasil akan diumumkan guru. Terima kasih sudah mengerjakan dengan jujur.</p>
            </div>
          </Kartu>
        </div>

        <aside className="space-y-4">
          <Kartu judul="Tanda terima">
            <dl className="divide-y divide-garis text-sm">
              <Baris label="Kode ujian" nilai={kode.toUpperCase()} />
              <Baris label="Nama" nilai={nama} />
              <Baris label="Waktu selesai" nilai={waktu} />
            </dl>
          </Kartu>
          <button type="button" onClick={onKeluar} className={`${kelasTombol("kedua", "besar")} w-full`}>
            Keluar
          </button>
        </aside>
      </main>
    </>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="text-tinta-2">{label}</dt>
      <dd className="truncate font-semibold text-tinta">{nilai}</dd>
    </div>
  );
}
