"use client";

import { useEffect, useState } from "react";
import { LayarMasuk } from "@/components/siswa/layar-masuk";
import { LayarCekPerangkat } from "@/components/siswa/layar-cek-perangkat";
import { LayarLobby } from "@/components/siswa/layar-lobby";
import { LayarKerjakan } from "@/components/siswa/layar-kerjakan";
import { LayarTerkunci } from "@/components/siswa/layar-terkunci";
import { LayarSelesai } from "@/components/siswa/layar-selesai";
import { ambilDraft, ambilSesi, bersihkan, simpanDraft, simpanSesi, type Draft } from "@/lib/siswa/sesi";

type Langkah = "splash" | "masuk" | "perangkat" | "lobby" | "kerjakan" | "terkunci" | "selesai";

// Satu aplikasi siswa (SPA) untuk versi web: alurnya sama seperti app mobile.
// splash -> masuk kode & pilih nama -> cek perangkat -> lobby -> kerjakan -> (terkunci) -> selesai
export function AplikasiSiswa() {
  const [langkah, setLangkah] = useState<Langkah>("splash");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [nama, setNama] = useState("-");
  const [kode, setKode] = useState("");
  const [ditolak, setDitolak] = useState(false);

  // Splash singkat, lalu pilih layar awal dari sesi tersimpan (bila ada).
  useEffect(() => {
    const sesi = ambilSesi();
    const draftTersimpan = ambilDraft();
    const t = window.setTimeout(() => {
      if (draftTersimpan) {
        setDraft(draftTersimpan);
        setNama(draftTersimpan.siswaNama);
      }
      if (sesi.token) setToken(sesi.token);
      if (sesi.kode) setKode(sesi.kode);
      setLangkah(sesi.token ? "lobby" : "masuk");
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  function pilihAwal(pilihan: Draft) {
    simpanDraft(pilihan);
    setDraft(pilihan);
    setNama(pilihan.siswaNama);
    setKode(pilihan.kode);
    setLangkah("perangkat");
  }

  function sesiSiap(sesi: { pesertaId: string; token: string; kode: string }) {
    simpanSesi(sesi);
    setToken(sesi.token);
    setKode(sesi.kode);
    setLangkah("lobby");
  }

  function tolak() {
    bersihkan();
    setToken(null);
    setDitolak(true);
    setLangkah("masuk");
  }

  function keluar() {
    bersihkan();
    setToken(null);
    setDraft(null);
    setNama("-");
    setKode("");
    setDitolak(false);
    setLangkah("masuk");
  }

  if (langkah === "splash") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas">
        <div className="flex flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-papan text-2xl font-extrabold text-white">B</span>
          <span className="mt-3 text-2xl font-extrabold tracking-tight text-tinta">Bilik</span>
          <span className="mt-1 text-sm text-tinta-2">Ujian aman untuk kelas</span>
          <span className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-nila/25 border-t-nila" aria-hidden />
        </div>
      </div>
    );
  }

  if (langkah === "masuk") {
    return <LayarMasuk ditolak={ditolak} onPilih={pilihAwal} />;
  }

  if (langkah === "perangkat" && draft) {
    return <LayarCekPerangkat draft={draft} onSelesai={sesiSiap} onKembali={() => setLangkah("masuk")} />;
  }

  if (langkah === "lobby" && token) {
    return <LayarLobby token={token} nama={nama} judul={draft?.ujianJudul ?? ""} onPindah={setLangkah} onDitolak={tolak} />;
  }

  if (langkah === "kerjakan" && token) {
    return <LayarKerjakan token={token} onSelesai={() => setLangkah("selesai")} onTerkunci={() => setLangkah("terkunci")} />;
  }

  if (langkah === "terkunci" && token) {
    return <LayarTerkunci token={token} onBuka={() => setLangkah("kerjakan")} />;
  }

  if (langkah === "selesai") {
    return <LayarSelesai nama={nama} kode={kode} judul={draft?.ujianJudul ?? ""} onKeluar={keluar} />;
  }

  // State tak terduga (mis. token hilang): kembali ke awal.
  return <LayarMasuk ditolak={ditolak} onPilih={pilihAwal} />;
}
