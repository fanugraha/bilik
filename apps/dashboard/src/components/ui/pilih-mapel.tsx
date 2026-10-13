"use client";

import { useState } from "react";
import type { MapelRingkas } from "@/lib/mapel";

const NILAI_BARU = "__baru__";

type PilihMapelProps = {
  daftar: MapelRingkas[];
  nama?: string;
  label?: string;
  terpilih?: string | null;
  bantuan?: string;
};

// Dropdown mapel dari master + opsi "tambah baru" agar ejaan tetap konsisten
export function PilihMapel({ daftar, nama = "mapel_id", label = "Mata pelajaran (opsional)", terpilih, bantuan }: PilihMapelProps) {
  const [nilai, setNilai] = useState(terpilih ?? "");
  const buatBaru = nilai === NILAI_BARU;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nama} className="text-sm font-medium text-tinta">
        {label}
      </label>
      <select
        id={nama}
        name={nama}
        value={nilai}
        onChange={(event) => setNilai(event.target.value)}
        aria-describedby={bantuan ? `${nama}-bantuan` : undefined}
        className="bidang"
      >
        <option value="">Tanpa mapel</option>
        {daftar.map((mapel) => (
          <option key={mapel.id} value={mapel.id}>
            {mapel.nama}
          </option>
        ))}
        <option value={NILAI_BARU}>+ Tambah mapel baru…</option>
      </select>
      {buatBaru && (
        <input
          name="mapel_baru"
          required
          autoFocus
          placeholder="Nama mapel baru, contoh: Bahasa Arab"
          aria-label="Nama mapel baru"
          className="bidang"
        />
      )}
      {bantuan && (
        <p id={`${nama}-bantuan`} className="text-xs text-tinta-2">
          {bantuan}
        </p>
      )}
    </div>
  );
}
