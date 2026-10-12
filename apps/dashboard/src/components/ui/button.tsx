"use client";

import { useFormStatus } from "react-dom";
import { kelasTombol, type JenisTombol, type UkuranTombol } from "@/components/ui/gaya-tombol";
import { Ikon, type NamaIkon } from "@/components/ui/ikon";

type TombolProps = {
  teks: string;
  jenis?: JenisTombol;
  ukuran?: UkuranTombol;
  formAction?: (formData: FormData) => void | Promise<void>;
  ikon?: NamaIkon;
  teksProses?: string;
  disabled?: boolean;
  nama?: string;
  nilai?: string;
  className?: string;
};

// Tombol submit form. Selama aksi berjalan, tombol nonaktif dan menampilkan teks proses
// sehingga guru tahu klik sudah diterima dan tidak menekan dua kali.
export function Tombol({
  teks,
  jenis = "utama",
  ukuran = "sedang",
  formAction,
  ikon,
  teksProses = "Memproses...",
  disabled = false,
  nama,
  nilai,
  className = "",
}: TombolProps) {
  const { pending, action } = useFormStatus();
  // Satu form bisa punya beberapa tombol dengan formAction berbeda; hanya yang diklik yang berubah
  const sedangProses = pending && (!formAction || action === formAction);

  return (
    <button
      type="submit"
      formAction={formAction}
      name={nama}
      value={nilai}
      disabled={disabled || pending}
      aria-busy={sedangProses}
      className={`${kelasTombol(jenis, ukuran)} ${className}`}
    >
      {sedangProses ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      ) : (
        ikon && <Ikon nama={ikon} className="h-4 w-4" />
      )}
      {sedangProses ? teksProses : teks}
    </button>
  );
}
