import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";

function namaFileAman(judul: string) {
  return judul.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "ujian";
}

const LABEL_TIPE: Record<string, string> = {
  pg: "Pilihan ganda",
  benar_salah: "Benar/Salah",
  angket: "Angket",
  essay: "Essay",
};

// Nilai jawaban jadi teks yang enak dibaca guru.
function teksJawaban(tipe: string, isi: string | null): string {
  if (isi == null || isi === "") return "";
  if (tipe === "benar_salah") {
    const kecil = isi.trim().toLowerCase();
    return kecil === "benar" ? "Benar" : kecil === "salah" ? "Salah" : isi;
  }
  if (tipe === "angket") {
    return ({ "4": "Sangat setuju", "3": "Setuju", "2": "Tidak setuju", "1": "Sangat tidak setuju" } as Record<string, string>)[isi] ?? isi;
  }
  return isi;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ujianId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });

  const judulKolom = [
    "Kelas",
    "No Absen",
    "Nama",
    ...rekap.listSoal.map((_, indeks) => `Soal ${indeks + 1}`),
    "Skor PG Otomatis",
    "Skor Manual",
    "Jawaban Belum Dinilai",
    "Total Skor",
    "Skor Maksimal",
    "Nilai",
    "Pelanggaran",
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bilik";
  const sheet = workbook.addWorksheet("Nilai");
  sheet.addRow(judulKolom);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const baris of rekap.listBaris) {
    const skorPerSoal = rekap.listSoal.map((soal) => {
      const jawaban = baris.listJawaban.find((item) => item.soalId === soal.soalId);
      return jawaban ? jawaban.skor : 0;
    });

    sheet.addRow([
      baris.namaKelas,
      baris.noAbsen,
      baris.nama,
      ...skorPerSoal,
      baris.skorOtomatis,
      baris.skorManual,
      baris.belumDinilai,
      baris.totalSkor,
      rekap.skorMaksimal,
      baris.nilai,
      baris.jumlahPelanggaran,
    ]);
  }

  sheet.columns.forEach((kolom) => {
    kolom.width = 14;
  });
  sheet.getColumn(3).width = 28; // Nama

  // Sheet 2: semua jawaban murid per soal (termasuk alasan Benar/Salah) untuk koreksi manual.
  const sheetJawaban = workbook.addWorksheet("Jawaban");
  sheetJawaban.addRow(["Kelas", "No Absen", "Nama", "No Soal", "Tipe", "Soal", "Jawaban", "Alasan", "Skor", "Bobot"]);
  sheetJawaban.getRow(1).font = { bold: true };
  sheetJawaban.views = [{ state: "frozen", ySplit: 1 }];

  for (const baris of rekap.listBaris) {
    for (const soal of rekap.listSoal) {
      const jawaban = baris.listJawaban.find((item) => item.soalId === soal.soalId);
      // Hanya soal yang dijawab murid yang ditulis (kolom kosong tidak perlu).
      if (!jawaban) continue;
      sheetJawaban.addRow([
        baris.namaKelas,
        baris.noAbsen,
        baris.nama,
        soal.urutan,
        LABEL_TIPE[soal.tipe] ?? soal.tipe,
        soal.teks,
        teksJawaban(soal.tipe, jawaban.isi),
        soal.tipe === "benar_salah" ? (jawaban.alasan ?? "") : "",
        jawaban.skor ?? "",
        soal.bobot,
      ]);
    }
  }

  sheetJawaban.columns.forEach((kolom) => {
    kolom.width = 12;
  });
  sheetJawaban.getColumn(3).width = 24; // Nama
  sheetJawaban.getColumn(6).width = 45; // Soal
  sheetJawaban.getColumn(7).width = 28; // Jawaban
  sheetJawaban.getColumn(8).width = 40; // Alasan
  sheetJawaban.eachRow((row, nomor) => {
    if (nomor === 1) return;
    for (const kolom of [6, 7, 8]) {
      row.getCell(kolom).alignment = { wrapText: true, vertical: "top" };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = `nilai-${namaFileAman(rekap.ujian.judul)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
