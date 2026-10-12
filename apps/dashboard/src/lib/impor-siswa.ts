// Pembaca data impor siswa. Dipakai dua kali dengan kode yang sama:
// di browser untuk pratinjau, dan di server action untuk validasi ulang sebelum simpan.

export const BATAS_BARIS_IMPOR = 200;
export const PANJANG_NAMA_MAKS = 100;
const NO_ABSEN_MAKS = 999;

export type StatusBaris = "baru" | "perbarui" | "sama" | "error";

export type BarisImpor = {
  nomorBaris: number;
  noAbsen: number | null;
  nama: string;
  status: StatusBaris;
  pesan: string;
};

export type HasilBacaImpor = {
  listBaris: BarisImpor[];
  pesanUmum: string | null;
};

// Pilih pemisah yang paling banyak muncul di baris pertama: tab (salin dari Excel), titik koma, atau koma
function tebakPemisah(barisPertama: string) {
  const jumlahTab = barisPertama.split("\t").length;
  const jumlahTitikKoma = barisPertama.split(";").length;
  const jumlahKoma = barisPertama.split(",").length;

  if (jumlahTab >= jumlahTitikKoma && jumlahTab >= jumlahKoma && jumlahTab > 1) return "\t";
  if (jumlahTitikKoma >= jumlahKoma && jumlahTitikKoma > 1) return ";";
  return ",";
}

// Pecah satu baris CSV, mendukung nilai dalam tanda kutip ("Siti, A.")
function pecahBaris(baris: string, pemisah: string) {
  const listSel: string[] = [];
  let selSekarang = "";
  let dalamKutip = false;

  for (let i = 0; i < baris.length; i++) {
    const huruf = baris[i];
    if (huruf === '"') {
      if (dalamKutip && baris[i + 1] === '"') {
        selSekarang += '"';
        i++;
      } else {
        dalamKutip = !dalamKutip;
      }
    } else if (huruf === pemisah && !dalamKutip) {
      listSel.push(selSekarang.trim());
      selSekarang = "";
    } else {
      selSekarang += huruf;
    }
  }
  listSel.push(selSekarang.trim());
  return listSel;
}

function adalahAngka(teks: string) {
  return /^\d+$/.test(teks);
}

function normalkanJudul(teks: string) {
  return teks.toLowerCase().replace(/[^a-z]/g, "");
}

export function bacaDataImpor(teksMentah: string, listSiswaAda: { no_absen: number | null; nama: string }[]): HasilBacaImpor {
  const listBarisTeks = teksMentah
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((baris) => baris.trimEnd())
    .filter((baris) => baris.trim() !== "");

  if (listBarisTeks.length === 0) return { listBaris: [], pesanUmum: null };

  const pemisah = tebakPemisah(listBarisTeks[0]);
  let listSelPerBaris = listBarisTeks.map((baris) => pecahBaris(baris, pemisah));

  // Kenali kolom dari baris judul bila ada; tanpa judul, kolom berisi angka dianggap no absen
  let kolomNoAbsen = -1;
  let kolomNama = -1;
  const judul = listSelPerBaris[0].map(normalkanJudul);
  const indeksJudulNama = judul.findIndex((sel) => sel === "nama" || sel === "namasiswa" || sel === "namalengkap");
  const indeksJudulAbsen = judul.findIndex((sel) => sel.includes("absen") || sel === "no" || sel === "nomor");

  if (indeksJudulNama !== -1) {
    kolomNama = indeksJudulNama;
    kolomNoAbsen = indeksJudulAbsen;
    listSelPerBaris = listSelPerBaris.slice(1);
  } else {
    const barisContoh = listSelPerBaris[0];
    if (barisContoh.length >= 2 && adalahAngka(barisContoh[0])) {
      kolomNoAbsen = 0;
      kolomNama = 1;
    } else if (barisContoh.length >= 2 && adalahAngka(barisContoh[1])) {
      kolomNama = 0;
      kolomNoAbsen = 1;
    } else {
      kolomNama = 0;
    }
  }

  const nomorBarisAwal = indeksJudulNama !== -1 ? 2 : 1;

  if (listSelPerBaris.length > BATAS_BARIS_IMPOR) {
    return {
      listBaris: [],
      pesanUmum: `Maksimal ${BATAS_BARIS_IMPOR} siswa sekali impor (data berisi ${listSelPerBaris.length} baris).`,
    };
  }

  const namaPerNoAbsenAda = new Map<number, string>();
  for (const siswa of listSiswaAda) {
    if (siswa.no_absen !== null) namaPerNoAbsenAda.set(siswa.no_absen, siswa.nama);
  }

  const jumlahPerNoAbsen = new Map<number, number>();
  const listBaris: BarisImpor[] = listSelPerBaris.map((listSel, indeks) => {
    const nama = (listSel[kolomNama] ?? "").replace(/\s+/g, " ").trim();
    const teksNoAbsen = kolomNoAbsen === -1 ? "" : (listSel[kolomNoAbsen] ?? "").trim();
    const noAbsen = adalahAngka(teksNoAbsen) ? parseInt(teksNoAbsen) : null;
    const baris: BarisImpor = { nomorBaris: indeks + nomorBarisAwal, noAbsen, nama, status: "baru", pesan: "" };

    if (!nama) {
      baris.status = "error";
      baris.pesan = "Nama kosong";
    } else if (nama.length > PANJANG_NAMA_MAKS) {
      baris.status = "error";
      baris.pesan = `Nama lebih dari ${PANJANG_NAMA_MAKS} karakter`;
    } else if (noAbsen === null) {
      baris.status = "error";
      baris.pesan = teksNoAbsen ? "No absen harus angka" : "No absen kosong";
    } else if (noAbsen < 1 || noAbsen > NO_ABSEN_MAKS) {
      baris.status = "error";
      baris.pesan = `No absen harus 1-${NO_ABSEN_MAKS}`;
    }

    if (noAbsen !== null) jumlahPerNoAbsen.set(noAbsen, (jumlahPerNoAbsen.get(noAbsen) ?? 0) + 1);
    return baris;
  });

  for (const baris of listBaris) {
    if (baris.status === "error" || baris.noAbsen === null) continue;

    if ((jumlahPerNoAbsen.get(baris.noAbsen) ?? 0) > 1) {
      baris.status = "error";
      baris.pesan = "No absen dobel di data impor";
      continue;
    }

    const namaLama = namaPerNoAbsenAda.get(baris.noAbsen);
    if (namaLama === undefined) continue;

    if (namaLama === baris.nama) {
      baris.status = "sama";
      baris.pesan = "Sudah ada, tidak berubah";
    } else {
      baris.status = "perbarui";
      baris.pesan = `Nama lama: ${namaLama}`;
    }
  }

  return { listBaris, pesanUmum: null };
}
