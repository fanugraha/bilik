"use client";

import type { MouseEvent } from "react";
import { Tombol } from "@/components/ui/button";
import type { JenisTombol, UkuranTombol } from "@/components/ui/gaya-tombol";
import type { NamaIkon } from "@/components/ui/ikon";

type TombolKonfirmasiProps = {
  teks: string;
  pesanKonfirmasi: string;
  jenis?: JenisTombol;
  ukuran?: UkuranTombol;
  ikon?: NamaIkon;
  formAction?: (formData: FormData) => void | Promise<void>;
  className?: string;
};

// Tombol submit yang meminta konfirmasi dulu, untuk aksi yang sulit dibatalkan
export function TombolKonfirmasi({ teks, pesanKonfirmasi, jenis = "utama", ukuran, ikon, formAction, className }: TombolKonfirmasiProps) {
  function cegahJikaBatal(event: MouseEvent<HTMLSpanElement>) {
    if (!window.confirm(pesanKonfirmasi)) event.preventDefault();
  }

  return (
    <span onClickCapture={cegahJikaBatal} className="contents">
      <Tombol teks={teks} jenis={jenis} ukuran={ukuran} ikon={ikon} formAction={formAction} className={className} />
    </span>
  );
}
