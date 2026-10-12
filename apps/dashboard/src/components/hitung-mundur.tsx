"use client";

import { useSyncExternalStore } from "react";

// Berlangganan detak per detik; snapshot = detik saat ini (stabil dalam satu detik)
function berlanggananDetik(panggil: () => void) {
  const interval = setInterval(panggil, 1000);
  return () => clearInterval(interval);
}
const ambilDetikSekarang = () => Math.floor(Date.now() / 1000);
const ambilDetikServer = () => null;

function formatSisa(totalDetik: number) {
  const jam = Math.floor(totalDetik / 3600);
  const menit = Math.floor((totalDetik % 3600) / 60);
  const detik = totalDetik % 60;
  const duaDigit = (angka: number) => String(angka).padStart(2, "0");
  return jam > 0 ? `${jam}:${duaDigit(menit)}:${duaDigit(detik)}` : `${duaDigit(menit)}:${duaDigit(detik)}`;
}

// Sisa waktu ujian, dihitung dari jam selesai di server (bukan timer lokal yang bisa melenceng)
export function HitungMundur({ selesaiIso, className = "" }: { selesaiIso: string; className?: string }) {
  const detikSekarang = useSyncExternalStore(berlanggananDetik, ambilDetikSekarang, ambilDetikServer);

  if (detikSekarang === null) return <span className={className}>--:--</span>;

  const sisaDetik = Math.max(0, Math.floor(new Date(selesaiIso).getTime() / 1000) - detikSekarang);
  const hampirHabis = sisaDetik > 0 && sisaDetik <= 300;

  return (
    <span className={`angka ${hampirHabis ? "text-amber-300" : ""} ${className}`} role="timer" aria-live="off">
      {sisaDetik === 0 ? "Waktu habis" : formatSisa(sisaDetik)}
    </span>
  );
}
