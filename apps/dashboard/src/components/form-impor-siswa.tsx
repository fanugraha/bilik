"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { imporSiswa } from "@/actions/siswa";
import { bacaDataImpor, BATAS_BARIS_IMPOR, type StatusBaris } from "@/lib/impor-siswa";
import { Tombol } from "@/components/ui/button";
import { Lencana } from "@/components/ui/lencana";

type FormImporSiswaProps = {
  kelasId: string;
  listSiswaAda: { no_absen: number | null; nama: string }[];
};

const ISI_TEMPLAT = "﻿no_absen;nama\r\n1;Contoh Nama Siswa\r\n";

const tampilanStatus: Record<StatusBaris, { label: string; nada: "hijau" | "biru" | "abu" | "merah" }> = {
  baru: { label: "Baru", nada: "hijau" },
  perbarui: { label: "Ganti nama", nada: "biru" },
  sama: { label: "Sudah ada", nada: "abu" },
  error: { label: "Perlu diperbaiki", nada: "merah" },
};

export function FormImporSiswa({ kelasId, listSiswaAda }: FormImporSiswaProps) {
  const [teksImpor, setTeksImpor] = useState("");
  const [pesanFile, setPesanFile] = useState<string | null>(null);

  const hasilBaca = useMemo(() => bacaDataImpor(teksImpor, listSiswaAda), [teksImpor, listSiswaAda]);

  let jumlahBaru = 0;
  let jumlahPerbarui = 0;
  let jumlahDilewati = 0;
  for (const baris of hasilBaca.listBaris) {
    if (baris.status === "baru") jumlahBaru++;
    else if (baris.status === "perbarui") jumlahPerbarui++;
    else jumlahDilewati++;
  }
  const jumlahDisimpan = jumlahBaru + jumlahPerbarui;

  async function bacaFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setPesanFile("Hanya file .csv. Untuk Excel, blok kolom lalu salin-tempel ke kotak di atas.");
      return;
    }
    if (file.size > 50_000) {
      setPesanFile("File terlalu besar (maks. 50 KB).");
      return;
    }

    setPesanFile(null);
    setTeksImpor(await file.text());
  }

  function unduhTemplat() {
    const url = URL.createObjectURL(new Blob([ISI_TEMPLAT], { type: "text/csv;charset=utf-8" }));
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = "templat-impor-siswa.csv";
    tautan.click();
    URL.revokeObjectURL(url);
  }

  return (
    <form action={imporSiswa} className="space-y-4">
      <input type="hidden" name="kelas_id" value={kelasId} />

      <p className="text-sm text-tinta-2">
        Blok kolom <strong className="text-tinta">No absen</strong> dan <strong className="text-tinta">Nama</strong> di
        Excel atau Google Sheets, salin, lalu tempel di sini. Maksimal {BATAS_BARIS_IMPOR} siswa sekali impor.
      </p>

      <textarea
        name="data_impor"
        value={teksImpor}
        onChange={(event) => setTeksImpor(event.target.value)}
        rows={6}
        placeholder={"No Absen\tNama\n1\tAndi Pratama\n2\tBudi Santoso"}
        aria-label="Data siswa yang ditempel"
        className="bidang"
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-garis-tegas px-3 text-xs font-semibold text-tinta hover:bg-kertas">
          Unggah CSV
          <input type="file" accept=".csv,text/csv" onChange={bacaFile} className="hidden" />
        </label>
        <button type="button" onClick={unduhTemplat} className="font-medium text-nila hover:text-nila-tua">
          Unduh templat CSV
        </button>
        {teksImpor && (
          <button type="button" onClick={() => setTeksImpor("")} className="text-tinta-2 hover:text-tinta">
            Kosongkan
          </button>
        )}
      </div>

      {pesanFile && <p className="text-sm text-merah">{pesanFile}</p>}
      {hasilBaca.pesanUmum && <p className="text-sm text-merah">{hasilBaca.pesanUmum}</p>}

      {hasilBaca.listBaris.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-tinta-2">
            <strong className="text-tinta">{jumlahBaru}</strong> baru, <strong className="text-tinta">{jumlahPerbarui}</strong>{" "}
            ganti nama, <strong className="text-tinta">{jumlahDilewati}</strong> dilewati
          </p>
          <div className="max-h-72 overflow-auto rounded-lg border border-garis">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-kertas text-xs font-semibold text-tinta-2">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">No.</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Hasil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {hasilBaca.listBaris.map((baris) => (
                  <tr key={baris.nomorBaris}>
                    <td className="angka px-3 py-1.5 text-tinta-3">{baris.nomorBaris}</td>
                    <td className="angka px-3 py-1.5">{baris.noAbsen ?? "-"}</td>
                    <td className="px-3 py-1.5">
                      {baris.nama || <span className="italic text-tinta-3">kosong</span>}
                      {baris.pesan && <span className="block text-xs text-tinta-2">{baris.pesan}</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <Lencana nada={tampilanStatus[baris.status].nada}>{tampilanStatus[baris.status].label}</Lencana>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Tombol
        teks={jumlahDisimpan > 0 ? `Impor ${jumlahDisimpan} siswa` : "Impor siswa"}
        teksProses="Mengimpor..."
        disabled={jumlahDisimpan === 0}
        className="w-full"
      />
    </form>
  );
}
