"use client";

import { useEffect, useRef, useState } from "react";
import { BilahAtas } from "@/components/siswa/rangka-siswa";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { Lencana } from "@/components/ui/lencana";
import { Pesan } from "@/components/ui/alert";
import { status as ambilStatus } from "@/lib/siswa/api";

type Pindah = "kerjakan" | "terkunci" | "selesai";

const URUTAN_ALUR = ["Guru mencocokkan nama Anda", "Guru membuka ujian serentak", "Soal muncul di layar ini"];

export function LayarLobby({
  token,
  nama,
  judul,
  onPindah,
  onDitolak,
}: {
  token: string;
  nama: string;
  judul: string;
  onPindah: (ke: Pindah) => void;
  onDitolak: () => void;
}) {
  const [disetujui, setDisetujui] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selesai = useRef(false);

  useEffect(() => {
    let aktif = true;
    async function cek() {
      if (selesai.current) return;
      try {
        const s = await ambilStatus(token);
        if (!aktif) return;
        if (s.ditolak) {
          selesai.current = true;
          onDitolak();
          return;
        }
        setDisetujui(Boolean(s.peserta?.disetujui));
        setError(null);
        if (s.peserta?.status === "mengerjakan") {
          selesai.current = true;
          onPindah("kerjakan");
        } else if (s.peserta?.status === "terkunci") {
          selesai.current = true;
          onPindah("terkunci");
        } else if (s.peserta?.status === "selesai") {
          selesai.current = true;
          onPindah("selesai");
        }
      } catch (e) {
        if (aktif) setError(e instanceof Error ? e.message : "Koneksi terputus, mencoba lagi…");
      }
    }
    cek();
    const t = window.setInterval(cek, 2000);
    return () => {
      aktif = false;
      window.clearInterval(t);
    };
  }, [token, onPindah, onDitolak]);

  return (
    <>
      <BilahAtas judul={judul} kanan={<Lencana nada={disetujui ? "hijau" : "biru"} titik={!disetujui}>{disetujui ? "Disetujui" : "Menunggu"}</Lencana>} />

      <div className="border-b border-garis bg-permukaan px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-2 text-sm text-tinta-2">
          <Ikon nama="ujian" className="h-4 w-4" />
          <span className="font-semibold text-tinta">Ruang tunggu</span>
          <span className="text-tinta-3">·</span>
          <span>Tetap di halaman ini sampai guru memulai.</span>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Kartu>
            <div className="flex flex-col items-center py-4 text-center">
              <span className={`flex h-20 w-20 items-center justify-center rounded-full ${disetujui ? "bg-hijau-muda text-hijau" : "bg-nila-muda text-nila"}`}>
                {disetujui ? <Ikon nama="centang" className="h-9 w-9" /> : <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-nila/25 border-t-nila" aria-hidden />}
              </span>
              <h1 className="mt-5 text-lg font-bold text-tinta">{disetujui ? "Disetujui, menunggu guru memulai" : "Menunggu persetujuan guru"}</h1>
              <p className="mt-1.5 max-w-md text-sm text-tinta-2">
                {disetujui
                  ? "Ujian akan dimulai serentak. Soal muncul otomatis di layar ini."
                  : "Guru sedang mencocokkan nama Anda. Jangan keluar dari halaman ini."}
              </p>
            </div>
          </Kartu>

          {error && (
            <div className="mt-4">
              <Pesan jenis="peringatan">{error}</Pesan>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Kartu judul="Peserta">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nila-muda text-sm font-bold text-nila">
                {nama.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-tinta">{nama}</p>
                <p className="text-xs text-tinta-2">Status: {disetujui ? "siap" : "menunggu"}</p>
              </div>
            </div>
          </Kartu>

          <Kartu judul="Alur selanjutnya">
            <ol className="space-y-3">
              {URUTAN_ALUR.map((teks, i) => {
                const aktif = disetujui ? i === 2 : i === 0;
                const lewat = disetujui && i < 2;
                return (
                  <li key={teks} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${lewat ? "bg-hijau text-white" : aktif ? "bg-nila text-white" : "bg-kertas text-tinta-3"}`}>
                      {lewat ? <Ikon nama="centang" className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={`text-sm ${aktif ? "font-semibold text-tinta" : "text-tinta-2"}`}>{teks}</span>
                  </li>
                );
              })}
            </ol>
          </Kartu>
        </aside>
      </main>
    </>
  );
}
