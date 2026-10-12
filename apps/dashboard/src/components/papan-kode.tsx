"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ikon } from "@/components/ui/ikon";

type PapanKodeProps = {
  kode: string | null;
  judul: string;
  infoWaktu?: ReactNode;
  children?: ReactNode;
};

// Papan kode ujian di ruang kontrol. Mode layar penuh untuk ditampilkan di proyektor kelas.
export function PapanKode({ kode, judul, infoWaktu, children }: PapanKodeProps) {
  const refPapan = useRef<HTMLElement>(null);
  const [layarPenuh, setLayarPenuh] = useState(false);

  useEffect(() => {
    const perbaruiStatus = () => setLayarPenuh(document.fullscreenElement === refPapan.current);
    document.addEventListener("fullscreenchange", perbaruiStatus);
    return () => document.removeEventListener("fullscreenchange", perbaruiStatus);
  }, []);

  function aturLayarPenuh() {
    if (document.fullscreenElement) document.exitFullscreen();
    else refPapan.current?.requestFullscreen();
  }

  if (layarPenuh) {
    return (
      <section ref={refPapan} className="flex h-full flex-col items-center justify-center gap-8 bg-papan p-10 text-center text-white">
        <p className="text-3xl font-semibold text-white/80">{judul}</p>
        <div>
          <p className="text-2xl text-white/70">Masukkan kode ini di aplikasi Bilik</p>
          <p className="angka mt-4 text-[min(18vw,16rem)] font-extrabold leading-none tracking-[0.12em]">{kode ?? "------"}</p>
        </div>
        {infoWaktu && <div className="text-4xl font-bold">{infoWaktu}</div>}
        <button type="button" onClick={aturLayarPenuh} className="mt-6 rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/10">
          Keluar layar penuh (Esc)
        </button>
      </section>
    );
  }

  return (
    <section ref={refPapan} className="rounded-2xl bg-papan p-6 text-white sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-white/70">Kode ujian</p>
          <p className="angka mt-1 text-6xl font-extrabold leading-none tracking-[0.14em] sm:text-7xl">{kode ?? "------"}</p>
          <p className="mt-3 text-sm text-white/70">Siswa membuka aplikasi Bilik di HP, lalu memasukkan kode ini.</p>
        </div>
        {infoWaktu && <div className="lg:text-right">{infoWaktu}</div>}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5">
        {children}
        <button
          type="button"
          onClick={aturLayarPenuh}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Ikon nama="layar-penuh" className="h-4 w-4" />
          Tampilkan di proyektor
        </button>
      </div>
    </section>
  );
}
