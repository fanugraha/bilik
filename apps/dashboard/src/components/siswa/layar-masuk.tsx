"use client";

import { useState } from "react";
import { BilahAtas, CangkangSiswa, Kolom } from "@/components/siswa/rangka-siswa";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { Lencana } from "@/components/ui/lencana";
import { Pesan } from "@/components/ui/alert";
import { kelasTombol } from "@/components/ui/gaya-tombol";
import { join, type JoinData } from "@/lib/siswa/api";
import { deviceId, type Draft } from "@/lib/siswa/sesi";

export function LayarMasuk({ onPilih, ditolak }: { onPilih: (draft: Draft) => void; ditolak?: boolean }) {
  const [kode, setKode] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JoinData | null>(null);

  async function cari() {
    const bersih = kode.trim().toUpperCase();
    if (bersih.length < 4) {
      setError("Kode ujian terdiri dari 6 karakter.");
      return;
    }
    setMemuat(true);
    setError(null);
    try {
      setData(await join({ kode: bersih, deviceId: deviceId() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal terhubung ke server. Periksa sambungan internet.");
    } finally {
      setMemuat(false);
    }
  }

  if (!data) {
    return (
      <CangkangSiswa langkah={1} judul="Masuk ujian" deskripsi="Masukkan kode 6 karakter dari guru untuk mulai.">
        {ditolak && (
          <div className="mb-4">
            <Pesan jenis="peringatan">Pendaftaran ditolak guru. Silakan pilih nama Anda sekali lagi.</Pesan>
          </div>
        )}
        <Kartu>
          <label htmlFor="kode" className="text-sm font-medium text-tinta">
            Kode ujian
          </label>
          <input
            id="kode"
            value={kode}
            onChange={(e) => setKode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && cari()}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC123"
            className="bidang angka mt-2 h-14 text-center text-2xl font-extrabold tracking-[0.3em]"
          />
          {error && (
            <div className="mt-3">
              <Pesan jenis="error">{error}</Pesan>
            </div>
          )}
          <button type="button" onClick={cari} disabled={memuat} className={`${kelasTombol("utama", "besar")} mt-4 w-full`}>
            {memuat ? <Spin /> : <Ikon nama="cari" className="h-4 w-4" />}
            {memuat ? "Mencari…" : "Cari ujian"}
          </button>
        </Kartu>
      </CangkangSiswa>
    );
  }

  return (
    <>
      <BilahAtas judul={data.ujian.judul} />
      <Kolom lebar="max-w-3xl">
        <KepalaHalaman
          judul={data.ujian.judul}
          deskripsi="Pilih nama Anda pada daftar kelas di bawah."
          aksi={
            <button type="button" onClick={() => setData(null)} className={kelasTombol("kedua")}>
              <Ikon nama="kembali" className="h-4 w-4" />
              Ganti kode
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-garis bg-garis sm:grid-cols-3">
          <MetaInfo ikon="jam" teks="Durasi" nilai={`${data.ujian.durasi} menit`} />
          <MetaInfo ikon="soal" teks="Mapel" nilai={data.ujian.mapel ?? "Umum"} />
          <MetaInfo ikon="kelas" teks="Kelas peserta" nilai={String(data.kelas.length)} />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-tinta">Pilih nama Anda</h2>
          {data.kelas.map((kelas) => (
            <Kartu key={kelas.id} judul={kelas.nama} deskripsi={`${kelas.siswa.length} siswa`} tanpaPadding>
              <ul className="divide-y divide-garis">
                {kelas.siswa.map((siswa) => (
                  <li key={siswa.id}>
                    <button
                      type="button"
                      disabled={siswa.terpakai}
                      onClick={() =>
                        onPilih({
                          kode: kode.trim().toUpperCase(),
                          kelasId: kelas.id,
                          kelasNama: kelas.nama,
                          siswaId: siswa.id,
                          siswaNama: siswa.nama,
                          ujianJudul: data.ujian.judul,
                        })
                      }
                      className="flex w-full items-center gap-3.5 px-5 py-3 text-left enabled:hover:bg-kertas disabled:cursor-not-allowed"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${siswa.terpakai ? "bg-kertas text-tinta-3" : "bg-nila-muda text-nila"}`}>
                        {siswa.no_absen ?? siswa.nama.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${siswa.terpakai ? "text-tinta-3" : "text-tinta"}`}>{siswa.nama}</span>
                        {siswa.terpakai && <span className="block text-xs text-tinta-3">Sudah dipakai di perangkat lain</span>}
                      </span>
                      {siswa.terpakai ? <Lencana nada="merah">Terpakai</Lencana> : <Ikon nama="lanjut" className="h-4 w-4 text-tinta-3" />}
                    </button>
                  </li>
                ))}
              </ul>
            </Kartu>
          ))}
        </div>
      </Kolom>
    </>
  );
}

function MetaInfo({ ikon, teks, nilai }: { ikon: "jam" | "soal" | "kelas"; teks: string; nilai: string }) {
  return (
    <div className="bg-permukaan px-5 py-4">
      <div className="flex items-center gap-1.5 text-tinta-2">
        <Ikon nama={ikon} className="h-3.5 w-3.5" />
        <dt className="text-xs">{teks}</dt>
      </div>
      <dd className="mt-1 truncate text-sm font-bold text-tinta">{nilai}</dd>
    </div>
  );
}

function Spin() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}
