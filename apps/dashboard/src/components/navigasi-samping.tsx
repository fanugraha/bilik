"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import { Ikon, type NamaIkon } from "@/components/ui/ikon";

const daftarMenu: { href: string; teks: string; ikon: NamaIkon }[] = [
  { href: "/dashboard", teks: "Beranda", ikon: "beranda" },
  { href: "/dashboard/kelas", teks: "Kelas & siswa", ikon: "kelas" },
  { href: "/dashboard/soal", teks: "Bank soal", ikon: "soal" },
  { href: "/dashboard/ujian", teks: "Ujian", ikon: "ujian" },
];

function menuAktif(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function MerekBilik() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-papan text-sm font-extrabold text-white">
        B
      </span>
      <span className="text-lg font-extrabold tracking-tight text-tinta">Bilik</span>
    </Link>
  );
}

export function NavigasiSamping({ namaGuru }: { namaGuru: string }) {
  const pathname = usePathname();
  const [menuTerbuka, setMenuTerbuka] = useState(false);

  const isiNavigasi = (
    <>
      <nav aria-label="Menu utama" className="flex flex-1 flex-col gap-1 px-3">
        {daftarMenu.map((menu) => {
          const aktif = menuAktif(pathname, menu.href);
          return (
            <Link
              key={menu.href}
              href={menu.href}
              aria-current={aktif ? "page" : undefined}
              onClick={() => setMenuTerbuka(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                aktif ? "bg-nila-muda text-nila" : "text-tinta-2 hover:bg-kertas hover:text-tinta"
              }`}
            >
              <Ikon nama={menu.ikon} />
              {menu.teks}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-garis px-3 py-4">
        <div className="mb-2 flex items-center gap-3 px-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kertas text-sm font-bold text-tinta-2">
            {namaGuru ? namaGuru.charAt(0).toUpperCase() : "?"}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-tinta">{namaGuru || "Guru"}</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-tinta-2 transition-colors hover:bg-kertas hover:text-merah"
          >
            <Ikon nama="keluar" />
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sidebar tetap */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-garis bg-permukaan lg:flex">
        <div className="flex h-16 items-center px-6">
          <MerekBilik />
        </div>
        {isiNavigasi}
      </aside>

      {/* HP & tablet: bilah atas + laci menu */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-garis bg-permukaan px-4 lg:hidden">
        <MerekBilik />
        <button
          type="button"
          onClick={() => setMenuTerbuka(true)}
          aria-label="Buka menu"
          aria-expanded={menuTerbuka}
          className="rounded-lg p-2 text-tinta-2 hover:bg-kertas"
        >
          <Ikon nama="menu" />
        </button>
      </div>

      {menuTerbuka && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMenuTerbuka(false)}
            className="absolute inset-0 bg-papan/40"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-permukaan shadow-xl">
            <div className="flex h-14 items-center justify-between px-6">
              <MerekBilik />
              <button
                type="button"
                onClick={() => setMenuTerbuka(false)}
                aria-label="Tutup menu"
                className="rounded-lg p-2 text-tinta-2 hover:bg-kertas"
              >
                <Ikon nama="tutup" />
              </button>
            </div>
            {isiNavigasi}
          </aside>
        </div>
      )}
    </>
  );
}
