"use client";

import { useState } from "react";
import { CangkangSiswa } from "@/components/siswa/rangka-siswa";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { Pesan } from "@/components/ui/alert";
import { kelasTombol } from "@/components/ui/gaya-tombol";
import { pilih } from "@/lib/siswa/api";
import { deviceId, type Draft } from "@/lib/siswa/sesi";

export function LayarCekPerangkat({
  draft,
  onSelesai,
  onKembali,
}: {
  draft: Draft;
  onSelesai: (sesi: { pesertaId: string; token: string; kode: string }) => void;
  onKembali: () => void;
}) {
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function masukLobby() {
    setMemuat(true);
    setError(null);
    try {
      const hasil = await pilih({ kode: draft.kode, kelasId: draft.kelasId, siswaId: draft.siswaId, deviceId: deviceId() });
      onSelesai({ pesertaId: hasil.peserta.id, token: hasil.token_sesi, kode: draft.kode });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftar ke server. Coba lagi.");
      setMemuat(false);
    }
  }

  return (
    <CangkangSiswa langkah={2} judul="Cek perangkat" deskripsi={`Siap bertugas, ${draft.siswaNama}? Pastikan perangkat dan koneksi siap.`}>
      <div className="space-y-4">
        <Kartu>
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nila-muda text-sm font-bold text-nila">
              {draft.siswaNama.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-tinta">{draft.siswaNama}</p>
              <p className="text-xs text-tinta-2">
                {draft.kelasNama}
                {draft.ujianJudul ? ` · ${draft.ujianJudul}` : ""}
              </p>
            </div>
          </div>
        </Kartu>

        <Kartu judul="Kesiapan perangkat" deskripsi="Versi web punya batasan dibanding aplikasi.">
          <ul className="space-y-4">
            <BarisCek
              judul="Penguncian layar"
              keterangan="Khusus aplikasi Android/iOS (Screen Pinning / Guided Access). Di web tidak tersedia."
              ok={false}
            />
            <BarisCek judul="Blokir screenshot" keterangan="Khusus aplikasi. Di web tidak tersedia." ok={false} />
            <BarisCek judul="Deteksi pindah tab" keterangan="Aktif. Pindah tab saat ujian dicatat sebagai pelanggaran." ok />
          </ul>

          <div className="mt-5">
            <Pesan jenis="peringatan">
              Untuk pengawasan penuh (layar terkunci, screenshot diblokir), pakai aplikasi Android. Tetap bisa lanjut di web.
            </Pesan>
          </div>

          {error && (
            <div className="mt-3">
              <Pesan jenis="error">{error}</Pesan>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onKembali} disabled={memuat} className={kelasTombol("kedua")}>
              Ganti nama
            </button>
            <button type="button" onClick={masukLobby} disabled={memuat} className={kelasTombol("utama")}>
              {memuat ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : <Ikon nama="kunci" className="h-4 w-4" />}
              {memuat ? "Mendaftar…" : "Siap, masuk lobby"}
            </button>
          </div>
        </Kartu>
      </div>
    </CangkangSiswa>
  );
}

function BarisCek({ judul, keterangan, ok }: { judul: string; keterangan: string; ok: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-hijau-muda text-hijau" : "bg-kuning-muda text-kuning"}`}>
        <Ikon nama={ok ? "centang" : "peringatan"} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-tinta">{judul}</p>
        <p className="text-xs text-tinta-2">{keterangan}</p>
      </div>
    </li>
  );
}
