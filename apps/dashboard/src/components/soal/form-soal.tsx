"use client";

import { useState } from "react";
import { Tombol } from "@/components/ui/button";
import { TautanTombol } from "@/components/ui/tautan-tombol";

type TipeSoal = "pg" | "benar_salah" | "essay";

export type NilaiAwalSoal = {
  tipe: TipeSoal;
  teks: string;
  bobot: number;
  opsi: string[];
  kunci: string | null;
  jawaban_benar: boolean | null;
  penjelasan: string | null;
  pedoman: string | null;
  bank_soal_id: string | null;
};

export type BankRingkas = { id: string; nama: string };

type FormSoalProps = {
  aksi: (formData: FormData) => void | Promise<void>;
  teksSimpan: string;
  idSoal?: string;
  nilaiAwal?: NilaiAwalSoal;
  daftarBank: BankRingkas[];
  bankTerpilih?: string;
  // Halaman tujuan setelah simpan/batal, mis. pemilih soal ujian. Kosong = kembali ke bank.
  kembali?: string | null;
  // Soal baru: tampilkan "Simpan & tulis lagi" agar guru bisa menulis banyak soal berturut-turut
  bolehTulisLagi?: boolean;
};

const pilihanTipe: { nilai: TipeSoal; teks: string; keterangan: string }[] = [
  { nilai: "pg", teks: "Pilihan ganda", keterangan: "Dinilai otomatis" },
  { nilai: "benar_salah", teks: "Benar/Salah", keterangan: "Dinilai otomatis" },
  { nilai: "essay", teks: "Essay", keterangan: "Dikoreksi guru" },
];

const hurufOpsi = ["A", "B", "C", "D", "E"];

// Form soal untuk halaman Buat dan Ubah. Hanya isian yang relevan dengan tipe soal yang tampil.
export function FormSoal({ aksi, teksSimpan, idSoal, nilaiAwal, daftarBank, bankTerpilih, kembali, bolehTulisLagi = false }: FormSoalProps) {
  const [tipe, setTipe] = useState<TipeSoal>(nilaiAwal?.tipe ?? "pg");
  const bankAwal = nilaiAwal?.bank_soal_id ?? bankTerpilih ?? daftarBank[0]?.id ?? "";
  const hrefBatal = kembali ?? (bankAwal ? `/dashboard/soal/bank/${bankAwal}` : "/dashboard/soal");

  return (
    <form action={aksi} className="space-y-6">
      {idSoal && <input type="hidden" name="id" value={idSoal} />}
      {kembali && <input type="hidden" name="kembali" value={kembali} />}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-tinta">Tipe soal</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {pilihanTipe.map((pilihan) => (
            <label
              key={pilihan.nilai}
              className={`flex cursor-pointer flex-col rounded-lg border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nila ${
                tipe === pilihan.nilai ? "border-nila bg-nila-muda" : "border-garis-tegas hover:bg-kertas"
              }`}
            >
              <input
                type="radio"
                name="tipe"
                value={pilihan.nilai}
                checked={tipe === pilihan.nilai}
                onChange={() => setTipe(pilihan.nilai)}
                className="sr-only"
              />
              <span className={`text-sm font-semibold ${tipe === pilihan.nilai ? "text-nila" : "text-tinta"}`}>{pilihan.teks}</span>
              <span className="text-xs text-tinta-2">{pilihan.keterangan}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bank_soal_id" className="text-sm font-medium text-tinta">
          Simpan ke bank
        </label>
        <select id="bank_soal_id" name="bank_soal_id" required defaultValue={bankAwal} className="bidang">
          {daftarBank.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teks" className="text-sm font-medium text-tinta">
            {tipe === "benar_salah" ? "Pernyataan" : "Pertanyaan"}
          </label>
          <textarea
            id="teks"
            name="teks"
            required
            rows={4}
            defaultValue={nilaiAwal?.teks}
            placeholder={tipe === "benar_salah" ? "Contoh: Air mendidih pada suhu 100°C di permukaan laut." : "Tulis pertanyaan di sini"}
            className="bidang resize-y"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bobot" className="text-sm font-medium text-tinta">
            Bobot
          </label>
          <input
            id="bobot"
            name="bobot"
            type="number"
            min="0.5"
            step="0.5"
            required
            defaultValue={nilaiAwal?.bobot ?? 1}
            aria-describedby="bobot-bantuan"
            className="bidang angka"
          />
          <p id="bobot-bantuan" className="text-xs text-tinta-2">
            Skor jika benar.
          </p>
        </div>
      </div>

      {tipe === "pg" && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-tinta">Pilihan jawaban</legend>
          <p className="mb-2 text-xs text-tinta-2">Isi minimal A dan B secara berurutan. Klik lingkaran di kiri untuk menandai kunci.</p>
          {hurufOpsi.map((huruf, indeks) => (
            <div key={huruf} className="flex items-center gap-3">
              <label className="flex shrink-0 cursor-pointer items-center gap-2" title={`Jadikan ${huruf} kunci jawaban`}>
                <input
                  type="radio"
                  name="kunci"
                  value={huruf}
                  required
                  defaultChecked={(nilaiAwal?.kunci ?? "A") === huruf}
                  className="h-4 w-4 accent-[var(--color-hijau)]"
                />
                <span className="w-4 text-sm font-semibold text-tinta-2">{huruf}</span>
              </label>
              <textarea
                name={`opsi_${huruf}`}
                required={indeks < 2}
                rows={1}
                defaultValue={nilaiAwal?.opsi[indeks] ?? ""}
                placeholder={indeks < 2 ? `Pilihan ${huruf}` : `Pilihan ${huruf} (opsional)`}
                aria-label={`Pilihan ${huruf}`}
                className="bidang resize-y"
              />
            </div>
          ))}
        </fieldset>
      )}

      {tipe === "benar_salah" && (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-tinta">Jawaban yang benar</legend>
            <div className="flex gap-2">
              {[
                { nilai: "true", teks: "Benar" },
                { nilai: "false", teks: "Salah" },
              ].map((pilihan) => (
                <label
                  key={pilihan.nilai}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-garis-tegas px-4 py-2 text-sm font-semibold text-tinta has-[:checked]:border-hijau has-[:checked]:bg-hijau-muda has-[:checked]:text-hijau"
                >
                  <input
                    type="radio"
                    name="jawaban_benar"
                    value={pilihan.nilai}
                    defaultChecked={String(nilaiAwal?.jawaban_benar ?? true) === pilihan.nilai}
                    className="accent-[var(--color-hijau)]"
                  />
                  {pilihan.teks}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="penjelasan" className="text-sm font-medium text-tinta">
              Penjelasan <span className="font-normal text-tinta-2">(opsional, hanya untuk guru)</span>
            </label>
            <textarea id="penjelasan" name="penjelasan" rows={2} defaultValue={nilaiAwal?.penjelasan ?? ""} className="bidang" />
          </div>
        </div>
      )}

      {tipe === "essay" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pedoman" className="text-sm font-medium text-tinta">
            Pedoman penilaian <span className="font-normal text-tinta-2">(opsional, hanya untuk guru)</span>
          </label>
          <textarea
            id="pedoman"
            name="pedoman"
            rows={3}
            defaultValue={nilaiAwal?.pedoman ?? ""}
            placeholder="Kata kunci atau kriteria jawaban yang dicari saat mengoreksi"
            className="bidang"
          />
        </div>
      )}

      {/* Tombol utama pertama di DOM agar Enter menyimpan biasa; tampilan dibalik supaya tetap di kanan */}
      <div className="flex flex-row-reverse flex-wrap justify-start gap-2 border-t border-garis pt-5">
        <Tombol teks={teksSimpan} teksProses="Menyimpan..." />
        {bolehTulisLagi && <Tombol teks="Simpan & tulis lagi" jenis="kedua" nama="lanjut" nilai="lagi" teksProses="Menyimpan..." />}
        <TautanTombol href={hrefBatal} teks="Batal" jenis="hantu" />
      </div>
    </form>
  );
}
