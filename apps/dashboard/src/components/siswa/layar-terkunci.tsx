"use client";

import { useState } from "react";
import { BilahAtas } from "@/components/siswa/rangka-siswa";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { Pesan } from "@/components/ui/alert";
import { kelasTombol } from "@/components/ui/gaya-tombol";
import { buka } from "@/lib/siswa/api";

export function LayarTerkunci({ token, onBuka }: { token: string; onBuka: () => void }) {
  const [kode, setKode] = useState("");
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cobaBuka() {
    if (!kode.trim()) {
      setError("Masukkan kode buka dari guru.");
      return;
    }
    setMemproses(true);
    setError(null);
    try {
      await buka(token, kode.trim());
      onBuka();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka kunci. Periksa sambungan lalu coba lagi.");
      setMemproses(false);
    }
  }

  return (
    <>
      <BilahAtas />
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Kartu>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-merah-muda text-merah">
                <Ikon nama="kunci" className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-lg font-bold text-tinta">Ujian terkunci</h1>
              <p className="mt-1 text-sm text-tinta-2">Anda melewati batas pelanggaran. Minta kode buka kepada guru.</p>
            </div>

            <div className="mt-6">
              <label htmlFor="kode-buka" className="text-sm font-medium text-tinta">
                Kode buka
              </label>
              <input
                id="kode-buka"
                value={kode}
                onChange={(e) => setKode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && cobaBuka()}
                autoComplete="off"
                placeholder="ABC123"
                className="bidang angka mt-2 h-14 text-center text-2xl font-extrabold tracking-[0.25em]"
              />
              {error && (
                <div className="mt-3">
                  <Pesan jenis="error">{error}</Pesan>
                </div>
              )}
              <button type="button" onClick={cobaBuka} disabled={memproses} className={`${kelasTombol("utama", "besar")} mt-4 w-full`}>
                {memproses ? "Membuka…" : "Buka kunci"}
              </button>
            </div>
          </Kartu>

          <div className="mt-4">
            <Pesan jenis="peringatan">Jangan tutup halaman. Timer ujian tetap berjalan.</Pesan>
          </div>
        </div>
      </main>
    </>
  );
}
