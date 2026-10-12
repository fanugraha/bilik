"use client";

import type { MouseEvent } from "react";
import { Tombol } from "@/components/ui/button";

type JenisTombol = "utama" | "kedua" | "bahaya";

type TombolKonfirmasiProps = {
  teks: string;
  pesanKonfirmasi: string;
  jenis?: JenisTombol;
  className?: string;
};

// Tombol submit form yang meminta konfirmasi dulu (PRD: Mulai/Akhiri wajib dikonfirmasi)
export function TombolKonfirmasi({ teks, pesanKonfirmasi, jenis = "utama", className }: TombolKonfirmasiProps) {
  function cegahJikaBatal(event: MouseEvent<HTMLSpanElement>) {
    if (!window.confirm(pesanKonfirmasi)) event.preventDefault();
  }

  return (
    <span onClickCapture={cegahJikaBatal} className="contents">
      <Tombol teks={teks} jenis={jenis} className={className} />
    </span>
  );
}
