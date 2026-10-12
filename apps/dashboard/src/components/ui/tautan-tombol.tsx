import Link from "next/link";
import { kelasTombol, type JenisTombol, type UkuranTombol } from "@/components/ui/gaya-tombol";
import { Ikon, type NamaIkon } from "@/components/ui/ikon";

type TautanTombolProps = {
  href: string;
  teks: string;
  jenis?: JenisTombol;
  ukuran?: UkuranTombol;
  ikon?: NamaIkon;
  className?: string;
  unduh?: boolean;
};

// Link yang tampil seperti tombol (pengganti pola <a><button/></a> yang tidak valid)
export function TautanTombol({ href, teks, jenis = "kedua", ukuran = "sedang", ikon, className = "", unduh }: TautanTombolProps) {
  const isi = (
    <>
      {ikon && <Ikon nama={ikon} className="h-4 w-4" />}
      {teks}
    </>
  );

  // File unduhan memakai <a> biasa agar tidak di-prefetch sebagai halaman
  if (unduh) {
    return (
      <a href={href} download className={`${kelasTombol(jenis, ukuran)} ${className}`}>
        {isi}
      </a>
    );
  }

  return (
    <Link href={href} className={`${kelasTombol(jenis, ukuran)} ${className}`}>
      {isi}
    </Link>
  );
}
