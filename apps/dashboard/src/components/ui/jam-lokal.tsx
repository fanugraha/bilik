"use client";

import { useSyncExternalStore } from "react";

type JamLokalProps = {
  waktuIso: string;
};

const tidakBerlangganan = () => () => {};

// Jam ditampilkan di zona waktu browser guru (WIB/WITA/WIT), bukan zona server
export function JamLokal({ waktuIso }: JamLokalProps) {
  const teksJam = useSyncExternalStore(
    tidakBerlangganan,
    () => new Date(waktuIso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }),
    () => "--:--",
  );

  return <span>{teksJam}</span>;
}
