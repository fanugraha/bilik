import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { kirimLinkLupaPassword } from "@/actions/auth";
import { CangkangAuth } from "@/components/cangkang-auth";
import { Pesan } from "@/components/ui/alert";
import { Tombol } from "@/components/ui/button";
import { KotakInput } from "@/components/ui/input";

export const metadata: Metadata = { title: "Lupa kata sandi" };

type ParamPesan = { error?: string; sukses?: string };

async function FormLupaPassword({ searchParams }: { searchParams: Promise<ParamPesan> }) {
  const { error, sukses } = await searchParams;

  return (
    <form className="flex flex-col gap-5">
      {error && <Pesan jenis="error">{error}</Pesan>}
      {sukses && <Pesan jenis="sukses">{sukses}</Pesan>}
      <KotakInput nama="email" label="Email akun guru" tipe="email" wajib placeholder="guru@sekolah.sch.id" autoComplete="email" />
      <Tombol teks="Kirim link atur ulang" teksProses="Mengirim..." formAction={kirimLinkLupaPassword} className="w-full" />
    </form>
  );
}

export default function LupaPasswordPage({ searchParams }: { searchParams: Promise<ParamPesan> }) {
  return (
    <CangkangAuth
      judul="Lupa kata sandi"
      deskripsi="Masukkan email akun Anda. Kami kirim link untuk membuat kata sandi baru."
      kaki={
        <Link href="/login" className="font-semibold text-nila hover:text-nila-tua">
          Kembali ke halaman masuk
        </Link>
      }
    >
      <Suspense fallback={null}>
        <FormLupaPassword searchParams={searchParams} />
      </Suspense>
    </CangkangAuth>
  );
}
