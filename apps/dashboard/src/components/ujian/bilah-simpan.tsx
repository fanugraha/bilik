"use client";

import { useEffect, useRef, useState } from "react";
import { Tombol } from "@/components/ui/button";
import { Ikon } from "@/components/ui/ikon";

// Bilah simpan lengket untuk koreksi essay.
// Tujuan: skor yang sudah diketik tidak hilang.
// - Tombol "Sebelumnya/Berikutnya" juga menyimpan form, bukan sekadar pindah halaman.
// - Perubahan yang belum disimpan ditandai, dan klik tautan keluar dikonfirmasi.
export function BilahSimpan({
  formId,
  adaManual,
  lanjutKe,
  kembaliKe,
}: {
  formId: string;
  adaManual: boolean;
  lanjutKe?: { id: string; nama: string };
  kembaliKe?: string;
}) {
  const [berubah, setBerubah] = useState(false);
  const berubahRef = useRef(false);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const tandai = () => {
      berubahRef.current = true;
      setBerubah(true);
    };
    const bersih = () => {
      berubahRef.current = false;
      setBerubah(false);
    };

    form.addEventListener("input", tandai);
    form.addEventListener("change", tandai);
    form.addEventListener("submit", bersih);

    const sebelumKeluar = (event: BeforeUnloadEvent) => {
      if (!berubahRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    // Navigasi dalam aplikasi tidak memicu beforeunload; cegat klik tautan keluar.
    const klikTautan = (event: MouseEvent) => {
      if (!berubahRef.current) return;
      const tautan = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!tautan) return;
      if (!window.confirm("Skor yang belum disimpan akan hilang. Tinggalkan halaman ini?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", sebelumKeluar);
    document.addEventListener("click", klikTautan, true);
    return () => {
      form.removeEventListener("input", tandai);
      form.removeEventListener("change", tandai);
      form.removeEventListener("submit", bersih);
      window.removeEventListener("beforeunload", sebelumKeluar);
      document.removeEventListener("click", klikTautan, true);
    };
  }, [formId]);

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-garis bg-permukaan/95 p-3 shadow-lg backdrop-blur">
      {berubah ? (
        <span role="status" className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-kuning">
          <Ikon nama="peringatan" className="h-4 w-4" />
          Belum disimpan
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-1 text-sm text-tinta-3">
          <Ikon nama="centang" className="h-4 w-4" />
          Tersimpan
        </span>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {kembaliKe && (
          <Tombol teks="Sebelumnya" nama="kembali_ke" nilai={kembaliKe} jenis="kedua" ukuran="kecil" ikon="kembali" teksProses="Menyimpan..." />
        )}
        {adaManual && <Tombol teks="Simpan skor" jenis="kedua" ukuran="kecil" teksProses="Menyimpan..." />}
        {lanjutKe && (
          <Tombol
            teks={adaManual ? `Simpan & lanjut: ${lanjutKe.nama}` : "Berikutnya"}
            nama="lanjut_ke"
            nilai={lanjutKe.id}
            jenis="utama"
            ukuran="kecil"
            teksProses="Menyimpan..."
          />
        )}
      </div>
    </div>
  );
}
