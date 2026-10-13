import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";

function namaFileAman(judul: string) {
  return judul.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "ujian";
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
    "Skor PG & B/S",
    "Skor Essay",
    "Essay Belum Dikoreksi",
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
      baris.skorEssay,
      baris.essayBelumDikoreksi,
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
